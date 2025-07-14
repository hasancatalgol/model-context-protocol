import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";

// Path to your persistent file
const CONTEXT_FILE = "./context.json";

// Load logs from file
function loadLogs(): Record<string, string> {
  if (fs.existsSync(CONTEXT_FILE)) {
    try {
      const raw = fs.readFileSync(CONTEXT_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return parsed.site_logs ?? {};
    } catch (err) {
      console.error("❌ Failed to parse context.json:", err);
      return {};
    }
  }
  return {};
}

// Save logs to file
function saveLogs(logs: Record<string, string>) {
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify({ site_logs: logs }, null, 2));
}

// Initialize in-memory logs from file
let siteLogs = loadLogs();

// Setup MCP server
const server = new McpServer({
  name: "daily-site-log-bot",
  version: "1.0.0"
});

// MCP handshake (Claude Desktop expects this on startup)
console.log(JSON.stringify({
  type: "mcp_server_metadata",
  name: "daily-site-log-bot",
  description: "Logs and retrieves daily civil engineering site activities.",
  version: "1.0.0"
}));

// Tool: log_site_activity
server.tool(
  "log_site_activity",
  {
    date: z.string(),
    entry: z.string()
  },
  async ({ date, entry }) => {
    siteLogs[date] = entry;
    saveLogs(siteLogs);

    console.error(`✅ siteLogs updated: ${JSON.stringify(siteLogs, null, 2)}`);

    return {
      content: [
        { type: "text", text: `✅ Logged activity for ${date}.` }
      ]
    };
  }
);

// Tool: get_log_by_date
server.tool(
  "get_log_by_date",
  {
    date: z.string()
  },
  async ({ date }) => {
    const entry = siteLogs[date];
    return {
      content: [
        {
          type: "text",
          text: entry
            ? `📅 ${date}: ${entry}`
            : `❌ No log found for ${date}.`
        }
      ]
    };
  }
);



// Start server
const transport = new StdioServerTransport();
(async () => {
  await server.connect(transport);
})();
