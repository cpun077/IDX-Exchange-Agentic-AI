import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod/v4";
import { searchActiveListings, getSoldComps, pool } from "../../skills/property-search/scripts/query_db.js";
import { getSession, updateSession, clearSession, saveResults } from "../../skills/property-search/scripts/user_session.js";
import { parsePropertyQuery } from "../../skills/property-search/scripts/text_parser.js";
import { getCityMarketSummary, getPriceTrend } from "../../skills/property-search/scripts/market_stats.js";

const server = new McpServer({ name: "property-search", version: "1.0.0" });

// logging
import { appendFileSync } from "node:fs";

const log = (event: string) =>
  appendFileSync("/tmp/property-mcp.log", `${event} PID=${process.pid}\n`);
//

server.registerTool(
  "search_active_listings",
  {
    description: "Search active MLS listings using session filters and save results.",
    inputSchema: z.object({
      sessionId: z.string(),
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(50).default(10),
    }),
  },
  async ({ sessionId, page, limit }) => {
    try {
      const rows = await searchActiveListings(
        getSession(sessionId).filters,
        page,
        limit
      );

      saveResults(sessionId, rows);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{
          type: "text" as const,
          text: `Database error: ${err instanceof Error ? err.message : "unknown error"}`,
        }],
      };
    }
  }
);


server.registerTool(
  "get_sold_comps",
  {
    description:
      "Get recently sold residential comps from california_sold for a given city, ordered by close date descending (max 50 rows).",
    inputSchema: z.object({
      city: z.string(),
      months: z.number().int().positive().max(60).default(12),
    }),
  },
  async ({ city, months }) => {
    try {
      const rows = await getSoldComps(city, months);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Database error: ${err instanceof Error ? err.message : "unknown error"}`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "get_session",
  {
    description: "Get or initialize a user session with current filters and search results.",
    inputSchema: z.object({
      sessionId: z.string(),
    }),
  },
  async ({ sessionId }) => {
    try {
      log("GET_SESSION");
      const session = getSession(sessionId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Session error: ${err instanceof Error ? err.message : "unknown error"}`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "update_session",
  {
    description: "Update a user session with new filters and remove specified filter keys.",
    inputSchema: z.object({
      sessionId: z.string(),
      queryText: z.string(),
    }),
  },
  async ({ sessionId, queryText }) => {
    try {
      log("UPDATE_SESSION"); // logging
      const parsed = parsePropertyQuery(queryText);
      const session = updateSession(sessionId, parsed);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Session error: ${err instanceof Error ? err.message : "unknown error"}`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "clear_session",
  {
    description: "Clear and delete a user session.",
    inputSchema: z.object({
      sessionId: z.string(),
    }),
  },
  async ({ sessionId }) => {
    try {
      clearSession(sessionId); // logging
      return {
        content: [{ type: "text" as const, text: `Session ${sessionId} cleared successfully.` }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Session error: ${err instanceof Error ? err.message : "unknown error"}`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "get_city_market_summary",
  {
    description: "Get market summary for the top 25 cities from the past 12 months (sale count, avg price, price per sqft, days on market, list-to-close ratio).",
    inputSchema: z.object({
      city: z.string()
    }),
  },
  async ({ city }) => {
    try {
      const rows = await getCityMarketSummary(pool, city);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{
          type: "text" as const,
          text: `Database error: ${err instanceof Error ? err.message : "unknown error"}`,
        }],
      };
    }
  }
);

server.registerTool(
  "get_price_trend",
  {
    description: "Get monthly price trend and statistics for a city with month-over-month price change percentage.",
    inputSchema: z.object({
      city: z.string(),
      months: z.number().int().positive().max(60).default(24),
    }),
  },
  async ({ city, months }) => {
    try {
      const rows = await getPriceTrend(pool, city, months);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{
          type: "text" as const,
          text: `Database error: ${err instanceof Error ? err.message : "unknown error"}`,
        }],
      };
    }
  }
);

async function main() {
  log("START"); // logging
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("property-search MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
