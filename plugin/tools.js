// plugin/tools.js
// Tool Definitions for the Agent

export const TOOLS = [
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
    }
];
