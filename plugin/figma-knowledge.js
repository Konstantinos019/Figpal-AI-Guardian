// plugin/figma-knowledge.js
// A condensed knowledge base for the AI to understand the Figma Plugin API.
// This is injected into the system prompt to guide figma_execute code generation.

export const FIGMA_API_KNOWLEDGE = `
# Figma Plugin API Guide for AI

You can execute arbitrary code using figma_execute({ code: "..." }). 
The code runs in an async environment with access to the global 'figma' object.

## Core Concepts
- Current Selection: figma.currentPage.selection (Array of nodes)
- Navigation: figma.viewport.scrollAndZoomIntoView(nodes)
- Notifications: figma.notify("message")

## Creating Nodes
- Frame: const frame = figma.createFrame()
- Text: const text = figma.createText(); await figma.loadFontAsync(text.fontName); text.characters = "Hello"
- Instance: const instance = component.createInstance()

## Colors & Styles
- Figma uses 0-1 range for RGB. Red is {r: 1, g: 0, b: 0}.
- Set Fills: node.fills = [{ type: 'SOLID', color: {r: 1, g: 0, b: 0} }]
- Set Strokes: node.strokes = [{ type: 'SOLID', color: {r: 0, g: 0, b: 0} }]

## Auto Layout
- frame.layoutMode = "HORIZONTAL" | "VERTICAL"
- frame.primaryAxisAlignItems = "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"
- frame.counterAxisAlignItems = "MIN" | "CENTER" | "MAX"
- frame.itemSpacing = 10
- frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 20

## Geometry & Constraints
- node.resize(width, height)
- node.x = 100; node.y = 200

## Advanced
- Find Nodes: figma.currentPage.findAll(n => n.name === "Target")
- Find by ID: figma.getNodeById("id")
- Variables: await figma.variables.getLocalVariablesAsync()

ALWAYS wrap your code in try/catch and return a result for visibility.
`;
