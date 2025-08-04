import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js"
import { 
  navigateToUrl,
  takeScreenshot,
  clickElement,
  fillInput,
  getText,
  waitForSelector,
  executeScript
} from "../tools/playwright-tools.js"

export function setupHandlers(server: Server) {
  // Handle tools/list requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "navigate_to_url",
          description: "Navigate to a specific URL",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "The URL to navigate to" },
              browser: { 
                type: "string", 
                enum: ["chromium", "firefox", "webkit"],
                default: "chromium",
                description: "Browser to use" 
              }
            },
            required: ["url"]
          }
        },
        {
          name: "take_screenshot",
          description: "Take a screenshot of the current page",
          inputSchema: {
            type: "object",
            properties: {
              fullPage: { 
                type: "boolean", 
                default: false,
                description: "Whether to take a full page screenshot" 
              },
              path: { 
                type: "string",
                description: "Path to save the screenshot" 
              }
            },
            required: ["path"]
          }
        },
        {
          name: "click_element",
          description: "Click on an element",
          inputSchema: {
            type: "object",
            properties: {
              selector: { 
                type: "string",
                description: "CSS selector or XPath of the element" 
              }
            },
            required: ["selector"]
          }
        },
        {
          name: "fill_input",
          description: "Fill an input field with text",
          inputSchema: {
            type: "object",
            properties: {
              selector: { 
                type: "string",
                description: "CSS selector or XPath of the input" 
              },
              text: { 
                type: "string",
                description: "Text to fill in the input" 
              }
            },
            required: ["selector", "text"]
          }
        },
        {
          name: "get_text",
          description: "Get text content from an element",
          inputSchema: {
            type: "object",
            properties: {
              selector: { 
                type: "string",
                description: "CSS selector or XPath of the element" 
              }
            },
            required: ["selector"]
          }
        },
        {
          name: "wait_for_selector",
          description: "Wait for an element to appear",
          inputSchema: {
            type: "object",
            properties: {
              selector: { 
                type: "string",
                description: "CSS selector or XPath to wait for" 
              },
              timeout: { 
                type: "number",
                default: 30000,
                description: "Timeout in milliseconds" 
              }
            },
            required: ["selector"]
          }
        },
        {
          name: "execute_script",
          description: "Execute JavaScript in the browser context",
          inputSchema: {
            type: "object",
            properties: {
              script: { 
                type: "string",
                description: "JavaScript code to execute" 
              }
            },
            required: ["script"]
          }
        }
      ]
    }
  })

  // Handle tools/call requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments provided')
    }

    try {
      let result: any

      switch (name) {
        case "navigate_to_url":
          if (typeof args.url !== 'string') {
            throw new Error('URL must be a string')
          }
          const browserType = args.browser as string
          if (browserType && !['chromium', 'firefox', 'webkit'].includes(browserType)) {
            throw new Error('Browser must be one of: chromium, firefox, webkit')
          }
          result = await navigateToUrl(args.url, (browserType as 'chromium' | 'firefox' | 'webkit') || "chromium")
          break
        case "take_screenshot":
          if (typeof args.path !== 'string') {
            throw new Error('Path must be a string')
          }
          result = await takeScreenshot(args.path, (args.fullPage as boolean) || false)
          break
        case "click_element":
          if (typeof args.selector !== 'string') {
            throw new Error('Selector must be a string')
          }
          result = await clickElement(args.selector)
          break
        case "fill_input":
          if (typeof args.selector !== 'string' || typeof args.text !== 'string') {
            throw new Error('Selector and text must be strings')
          }
          result = await fillInput(args.selector, args.text)
          break
        case "get_text":
          if (typeof args.selector !== 'string') {
            throw new Error('Selector must be a string')
          }
          result = await getText(args.selector)
          break
        case "wait_for_selector":
          if (typeof args.selector !== 'string') {
            throw new Error('Selector must be a string')
          }
          result = await waitForSelector(args.selector, (args.timeout as number) || 30000)
          break
        case "execute_script":
          if (typeof args.script !== 'string') {
            throw new Error('Script must be a string')
          }
          result = await executeScript(args.script)
          break
        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  })
}