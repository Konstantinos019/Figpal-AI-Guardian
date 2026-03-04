import { google } from "@ai-sdk/google";
import { streamText, stepCountIs, convertToModelMessages, tool, jsonSchema } from "ai";
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

// Figma Bridge tools — CLIENT-SIDE tools that the plugin executes.
// AI SDK v6: tools WITHOUT an `execute` function are "client-side tools".
// streamText pauses on them and emits a pending tool-call part with state='input-available'.
// The browser (page.tsx) intercepts via postMessage → Figma plugin → real Figma API → addToolResult().
// CRITICAL: DO NOT add execute() here — that would make the AI SDK run them server-side
// (returning fake data) and the client would never get to intercept.
// `inputSchema: jsonSchema({...})` is required (AI SDK v6 renamed parameters → inputSchema).
const BRIDGE_TOOLS: Record<string, any> = {
  figma_execute: {
    description: "POWER TOOL: Execute arbitrary JavaScript in the Figma Plugin sandbox. Has full access to the Figma API (figma.currentPage, figma.createRectangle, etc). Use for any design manipulation: creating nodes, changing styles, reading properties, or complex batch operations.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript to execute. Can use async/await. Access the 'figma' global for all Figma API calls." }
      },
      required: ["code"]
    })
  },
  figma_get_selection_info: {
    description: "Get detailed JSON information about the currently selected nodes in Figma (names, types, fills, dimensions, etc).",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        refresh: { type: "boolean", description: "Force a fresh fetch (optional)" }
      }
    })
  },
  figma_get_design_context: {
    description: "Get a comprehensive overview of the Figma canvas: current page, full selection tree, and document hierarchy.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        depth: { type: "number", description: "Depth of hierarchy to fetch (default 1)" }
      }
    })
  },
  figma_create_rectangle: {
    description: "Create a new rectangle on the Figma canvas.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the rectangle" },
        width: { type: "number", description: "Width in pixels" },
        height: { type: "number", description: "Height in pixels" },
        color: { type: "string", description: "Hex fill color (optional, e.g. #FF0000)" }
      },
      required: ["width", "height"]
    })
  },
  figma_rename_node: {
    description: "Rename a node by ID, or rename the currently selected node if no ID given.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        id: { type: "string", description: "Node ID to rename (optional, defaults to current selection)" },
        newName: { type: "string", description: "New name for the node" }
      },
      required: ["newName"]
    })
  },
  figma_change_fill_color: {
    description: "Change the fill color of the currently selected node.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        hex: { type: "string", description: "Hex color code (e.g. #FF0000)" }
      },
      required: ["hex"]
    })
  }
};

/**
 * Gemini strictly requires every tool's parameters schema to be
 * { type: "object", properties: { ... } }.
 * MCP servers can return tools with null/undefined/empty schemas.
 * This function normalises them so Gemini never sees a bad schema.
 */
function sanitizeToolSchema(t: any): any {
  // AI SDK v6: tools use `inputSchema` (not `parameters`)
  // MCP tools from @ai-sdk/mcp arrive with inputSchema already set as a jsonSchema() wrapper
  // Check if inputSchema is valid — if it has a .jsonSchema property it's already good
  const schema = t?.inputSchema;
  if (schema && typeof schema === 'object' && (schema.jsonSchema || schema.type === 'object')) return t;
  // Missing or invalid → inject a safe empty schema using jsonSchema() wrapper
  return {
    ...t,
    inputSchema: jsonSchema({
      type: 'object',
      properties: schema?.properties && typeof schema.properties === 'object'
        ? schema.properties
        : {}
    })
  };
}

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
          controller.enqueue(encoder.encode(": keepalive\n\n"));
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

        // Merge tools, prioritizing Bridge for Figma if it's active
        const combinedTools: Record<string, any> = { ...mcpResult.allTools };
        if (useBridge) {
          console.log("[Chat] Enforcing Bridge-only mode for Figma tools");
          // Aggressively purge any figma_* tools from MCP to ensure only Bridge versions are used
          Object.keys(combinedTools).forEach(key => {
            if (key.startsWith('figma_')) {
              delete combinedTools[key];
            }
          });
          Object.assign(combinedTools, BRIDGE_TOOLS);
        } else {
          // Fallback: merge bridge tools but let MCP take precedence
          Object.assign(combinedTools, {
            ...BRIDGE_TOOLS,
            ...combinedTools
          });
        }

        console.log("[Chat] Combined tools keys:", Object.keys(combinedTools));
        // Deep log of tool inputSchema to debug Gemini schema issues (AI SDK v6 uses inputSchema)
        const { asSchema } = await import('@ai-sdk/provider-utils');
        Object.entries(combinedTools).forEach(([name, t]) => {
          const toolData = t as any;
          try {
            const schema = asSchema(toolData.inputSchema).jsonSchema;
            console.log(`[Chat] Tool: ${name}, inputSchema:`, JSON.stringify(schema));
          } catch {
            console.log(`[Chat] Tool: ${name}, inputSchema: [error extracting schema]`);
          }
        });

        const result = streamText({
          model: google(model || "gemini-2.0-flash"),
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
    const safeTool = sanitizeToolSchema(tool);
    wrapped[name] = {
      ...safeTool,
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
    system += `\n\n### FIGMA BRIDGE ACTIVE
The bridge is CONNECTED. Prioritize the bridge-compatible figma_* tools as instructed in the main prompt for all canvas interactions.`;
  }

  const mcpConnectionPromise = connectMCPs(
    useBridge ? undefined : figmaMcpUrl, // Skip Figma MCP if Bridge is active
    figmaAccessToken,
    resolvedCodeProjectPath,
    figmaOAuth,
    tunnelSecret,
    mcpCodeUrlHeader
  );
  const stream = createKeepaliveStream(mcpConnectionPromise, modelMessages, system, model, !!useBridge);

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}