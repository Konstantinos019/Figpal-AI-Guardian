import { google } from "@ai-sdk/google";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { GUARDIAN_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { cookies } from "next/headers";
import {
  createFigmaMcpOAuthProvider,
  MCP_FIGMA_SERVER_URL,
  COOKIE_TOKENS,
} from "@/lib/figma-mcp-oauth";

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const TOOL_TIMEOUT_MS = 60_000;
const CONNECTION_TIMEOUT_MS = 30_000;
const MAX_AGE_MS = 2 * 60_000;
const HEALTHCHECK_TIMEOUT_MS = 5_000;
const STREAM_KEEPALIVE_MS = 5_000;

// Figma Bridge tools that should be executed client-side
const BRIDGE_TOOLS = {
  figma_execute: {
    description: "POWER TOOL: Execute arbitrary JavaScript using the Figma Plugin API. Use this for complex layouts, batch operations, or creating design system components from scratch.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "The JavaScript code to execute. Can use async/await. Has access to the 'figma' global." },
      },
      required: ["code"]
    }
  },
  get_selection_info: {
    description: "Get detailed information about the currently selected nodes in the Figma canvas.",
    parameters: { type: "object", properties: {} }
  },
  create_rectangle: {
    description: "Create a new rectangle on the canvas.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the rectangle" },
        width: { type: "number", description: "Width in pixels" },
        height: { type: "number", description: "Height in pixels" },
        color: { type: "string", description: "Hex color (optional)" }
      },
      required: ["width", "height"]
    }
  },
  rename_node: {
    description: "Rename the currently selected node specifically.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The new name for the layer" }
      },
      required: ["name"]
    }
  }
};

function encodeSSEMessage(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

function createKeepaliveStream(
  mcpConnectionPromise: Promise<{ allTools: Record<string, unknown>; mcpErrors: string[] }>,
  modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>,
  system: string,
  model: string,
  useBridge: boolean
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let keepaliveInterval: NodeJS.Timeout | null = null;
      let isMcpReady = false;

      controller.enqueue(encoder.encode(encodeSSEMessage("start", {})));
      const statusId = `mcp-status-${Date.now()}`;
      controller.enqueue(encoder.encode(encodeSSEMessage("text-start", { id: statusId })));
      controller.enqueue(encoder.encode(encodeSSEMessage("text-delta", {
        id: statusId,
        delta: "[MCP_STATUS:connecting]"
      })));

      const sendKeepalive = () => {
        if (!isMcpReady && controller.desiredSize !== null) {
          controller.enqueue(encoder.encode(encodeSSEMessage("ping", { timestamp: Date.now() })));
        }
      };
      keepaliveInterval = setInterval(sendKeepalive, STREAM_KEEPALIVE_MS);

      try {
        const mcpResult = await Promise.race([
          mcpConnectionPromise,
          new Promise<{ allTools: Record<string, unknown>; mcpErrors: string[] }>((resolve) =>
            setTimeout(() => resolve({ allTools: {}, mcpErrors: ["MCP connection timeout"] }), 30_000)
          )
        ]);

        isMcpReady = true;
        if (keepaliveInterval) clearInterval(keepaliveInterval);

        const { mcpErrors } = mcpResult;

        controller.enqueue(encoder.encode(encodeSSEMessage("text-delta", {
          id: statusId,
          delta: "[MCP_STATUS:connected]"
        })));
        controller.enqueue(encoder.encode(encodeSSEMessage("text-end", { id: statusId })));

        if (mcpErrors.length > 0 && !useBridge) {
          const errorId = `mcp-error-${Date.now()}`;
          controller.enqueue(encoder.encode(encodeSSEMessage("text-start", { id: errorId })));
          controller.enqueue(encoder.encode(encodeSSEMessage("text-delta", {
            id: errorId,
            delta: `\n\n[MCP_ERROR_BLOCK]${mcpErrors.join("\n")}[/MCP_ERROR_BLOCK]\n\n`
          })));
          controller.enqueue(encoder.encode(encodeSSEMessage("text-end", { id: errorId })));
        }

        const combinedTools = { ...mcpResult.allTools };
        if (useBridge) {
          Object.assign(combinedTools, BRIDGE_TOOLS);
        }

        const result = streamText({
          model: google("gemini-1.5-pro"),
          system,
          messages: modelMessages,
          tools: combinedTools as any,
          stopWhen: stepCountIs(10),
        });

        const aiStream = result.toUIMessageStreamResponse().body;
        if (aiStream) {
          const reader = aiStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            reader.releaseLock();
          }
        }

      } catch (error) {
        if (keepaliveInterval) clearInterval(keepaliveInterval);
        const errorMsg = error instanceof Error ? error.message : String(error);
        controller.enqueue(encoder.encode(encodeSSEMessage("text", { content: `❌ Error: ${errorMsg}` })));
        controller.enqueue(encoder.encode(encodeSSEMessage("finish", { finishReason: "error" })));
      } finally {
        controller.close();
      }
    },
    cancel() {
      console.log("[Chat] Stream cancelled");
    }
  });
}

function detectTransport(url: string): "sse" | "http" {
  return url.includes("/sse") ? "sse" : "http";
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

type CachedMCP = { client: MCPClient; tools: Record<string, unknown>; connectedAt: number };
const globalCache = globalThis as any;
if (!globalCache.__mcpClients) globalCache.__mcpClients = new Map();
const mcpClients: Map<string, CachedMCP> = globalCache.__mcpClients;

async function healthcheckMCP(client: MCPClient, label: string): Promise<boolean> {
  try {
    await withTimeout(client.tools(), HEALTHCHECK_TIMEOUT_MS, `Healthcheck for ${label}`);
    return true;
  } catch { return false; }
}

async function connectMCPAuto(url: string, label: string, headers?: Record<string, string>): Promise<CachedMCP> {
  const transport = detectTransport(url);
  const client = await withTimeout(
    createMCPClient({ transport: { type: transport, url, headers } }),
    CONNECTION_TIMEOUT_MS,
    `MCP connection to ${label}`
  );
  const tools = await withTimeout(client.tools(), CONNECTION_TIMEOUT_MS, `Tool discovery for ${label}`);
  const entry = { client, tools, connectedAt: Date.now() };
  mcpClients.set(url, entry);
  return entry;
}

async function evict(url: string) {
  const cached = mcpClients.get(url);
  if (cached) {
    mcpClients.delete(url);
    try { await cached.client.close(); } catch { }
  }
}

async function getOrConnect(url: string, label: string, headers?: Record<string, string>): Promise<CachedMCP> {
  const cached = mcpClients.get(url);
  if (cached) {
    if (await healthcheckMCP(cached.client, label) && Date.now() - cached.connectedAt < MAX_AGE_MS) return cached;
    await evict(url);
  }
  return connectMCPAuto(url, label, headers);
}

async function getOrConnectWithAuth(url: string, label: string, authProvider: any, headers?: Record<string, string>): Promise<CachedMCP> {
  const cached = mcpClients.get(url);
  if (cached) {
    if (await healthcheckMCP(cached.client, label) && Date.now() - cached.connectedAt < MAX_AGE_MS) return cached;
    await evict(url);
  }
  const client = await withTimeout(
    createMCPClient({ transport: { type: detectTransport(url), url, authProvider, headers } }),
    CONNECTION_TIMEOUT_MS,
    `MCP Auth connection to ${label}`
  );
  const tools = await withTimeout(client.tools(), CONNECTION_TIMEOUT_MS, `Tool discovery for ${label}`);
  const entry = { client, tools, connectedAt: Date.now() };
  mcpClients.set(url, entry);
  return entry;
}

function wrapToolsWithRetry(tools: Record<string, any>, url: string, label: string, headers?: Record<string, string>): Record<string, any> {
  const wrapped: Record<string, any> = {};
  for (const [name, tool] of Object.entries(tools)) {
    wrapped[name] = {
      ...tool,
      execute: async (...args: any[]) => {
        try {
          return await withTimeout(tool.execute(...args), TOOL_TIMEOUT_MS, `Tool "${name}"`);
        } catch (e) {
          await evict(url);
          const fresh = await connectMCPAuto(url, label, headers);
          return await withTimeout((fresh.tools[name] as any).execute(...args), TOOL_TIMEOUT_MS, `Tool "${name}" (retry)`);
        }
      }
    };
  }
  return wrapped;
}

async function connectMCPs(
  figmaMcpUrl: string | undefined,
  figmaAccessToken: string | undefined,
  resolvedCodeProjectPath: string | undefined,
  figmaOAuth: boolean | undefined,
  tunnelSecret: string | undefined,
  mcpCodeUrlHeader: string | null
): Promise<{ allTools: Record<string, unknown>; mcpErrors: string[] }> {
  const allTools: Record<string, unknown> = {};
  const mcpErrors: string[] = [];

  if (figmaMcpUrl) {
    try {
      const cookieStore = await cookies();
      const oauthToken = cookieStore.get("figma_access_token")?.value;
      const effectiveUrl = (figmaOAuth && figmaMcpUrl === "https://mcp.figma.com/mcp") ? figmaMcpUrl : figmaMcpUrl;
      const headers: Record<string, string> = {};
      if (tunnelSecret && !effectiveUrl.includes('figma.com')) headers['X-Auth-Token'] = tunnelSecret;

      let mcpResult;
      if (figmaOAuth) {
        mcpResult = await getOrConnectWithAuth(effectiveUrl, "Figma", createFigmaMcpOAuthProvider(cookieStore), headers);
      } else {
        const token = figmaAccessToken || oauthToken || process.env.FIGMA_ACCESS_TOKEN;
        if (token) headers.Authorization = `Bearer ${token}`;
        mcpResult = await getOrConnect(effectiveUrl, "Figma", headers);
      }
      Object.assign(allTools, wrapToolsWithRetry(
        Object.fromEntries(Object.entries(mcpResult.tools).map(([n, t]) => [`figma_${n}`, t])),
        effectiveUrl, "Figma", headers
      ));
    } catch (e: any) { mcpErrors.push(`Figma MCP failed: ${e.message}`); }
  }

  if (resolvedCodeProjectPath) {
    try {
      const headers: Record<string, string> = {};
      if (tunnelSecret) headers['X-Auth-Token'] = tunnelSecret;
      if (mcpCodeUrlHeader) headers['X-MCP-Code-URL'] = mcpCodeUrlHeader;
      const mcpResult = await getOrConnect(resolvedCodeProjectPath, "Code", headers);
      Object.assign(allTools, wrapToolsWithRetry(
        Object.fromEntries(Object.entries(mcpResult.tools).map(([n, t]) => [`code_${n}`, t])),
        resolvedCodeProjectPath, "Code", headers
      ));
    } catch (e: any) { mcpErrors.push(`Code MCP failed: ${e.message}`); }
  }

  return { allTools, mcpErrors };
}

export async function POST(req: Request) {
  const { messages, figmaMcpUrl, figmaAccessToken, codeProjectPath, figmaOAuth, model, selectedNode, tunnelSecret, useBridge } = await req.json();
  const mcpCodeUrlHeader = req.headers.get("X-MCP-Code-URL");
  let resolvedCodeProjectPath = codeProjectPath || mcpCodeUrlHeader;

  const modelMessages = await convertToModelMessages(messages);
  let system = GUARDIAN_SYSTEM_PROMPT;
  if (selectedNode) {
    system += `\n\n### SELECTED FIGMA NODE\nURL: ${selectedNode}\nDo NOT call selection tools. This node IS the context. Use it with other tools.`;
  }
  if (useBridge) {
    system += `\n\n### FIGMA BRIDGE ACTIVE\nYou have access to the live Figma canvas via a bridge. Use figma_* tools for canvas operations. These will be executed by the client.`;
  }

  const mcpConnectionPromise = connectMCPs(figmaMcpUrl, figmaAccessToken, resolvedCodeProjectPath, figmaOAuth, tunnelSecret, mcpCodeUrlHeader);
  const stream = createKeepaliveStream(mcpConnectionPromise, modelMessages, system, model, !!useBridge);

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}