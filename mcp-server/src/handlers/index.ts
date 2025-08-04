import { Server } from "@modelcontextprotocol/sdk/server/index.js"
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
  server.setRequestHandler("tools/list", async () => ({
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
  }))

  server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params

    try {
      let result: any

      switch (name) {
        case "navigate_to_url":
          result = await navigateToUrl(args.url, args.browser || "chromium")
          break
        case "take_screenshot":
          result = await takeScreenshot(args.path, args.fullPage || false)
          break
        case "click_element":
          result = await clickElement(args.selector)
          break
        case "fill_input":
          result = await fillInput(args.selector, args.text)
          break
        case "get_text":
          result = await getText(args.selector)
          break
        case "wait_for_selector":
          result = await waitForSelector(args.selector, args.timeout || 30000)
          break
        case "execute_script":
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