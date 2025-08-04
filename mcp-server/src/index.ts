import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { setupHandlers } from "./handlers/index.js"

async function main() {
  const server = new Server(
    {
      name: "playwright-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  setupHandlers(server)

  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  console.error("Playwright MCP Server started")
}

main().catch(console.error)