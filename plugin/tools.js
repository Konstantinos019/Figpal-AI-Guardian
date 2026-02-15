// plugin/tools.js
// Tool Definitions for the Agent

export const TOOLS = [
    {
        name: "figma_execute",
        description: "POWER TOOL: Execute arbitrary JavaScript using the Figma Plugin API. Use this for complex layouts, batch operations, or creating design system components from scratch.",
        parameters: {
            type: "object",
            properties: {
                code: { type: "string", description: "The JavaScript code to execute. Can use async/await. Has access to the 'figma' global." },
                timeout: { type: "number", description: "Optional timeout in ms (default 5000)" }
            },
            required: ["code"]
        }
    },
    {
        name: "get_design_tokens",
        description: "Fetch all local variables and collections (design tokens) from the current file.",
        parameters: {
            type: "object",
            properties: {
                refresh: { type: "boolean", description: "Force a fresh fetch instead of using cached data." }
            }
        }
    },
    {
        name: "rename_node",
        description: "Rename the currently selected node specifically.",
        parameters: {
            type: "object",
            properties: {
                id: { type: "string", description: "The ID of the node to rename (optional, defaults to selection)" },
                name: { type: "string", description: "The new name for the layer" }
            },
            required: ["name"]
        }
    },
    {
        name: "change_fill_color",
        description: "Change the fill color of the selected node. Uses Hex code.",
        parameters: {
            type: "object",
            properties: {
                hex: { type: "string", description: "Hex color code (e.g. #FF0000)" }
            },
            required: ["hex"]
        }
    },
    {
        name: "create_rectangle",
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
    {
        name: "get_selection_info",
        description: "Get detailed information about the currently selected nodes.",
        parameters: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "read_vfs_file",
        description: "Read the content of a file from the user's local codebase via VFS.",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "The relative path to the file (e.g. 'src/App.js')" }
            },
            required: ["path"]
        }
    }
];
