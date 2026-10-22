import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod/v4";
import { searchActiveListings, getSoldComps } from "../../skills/property-search/query_db.js";

const server = new McpServer({ name: "property-search", version: "1.0.0" });

const VALID_TYPES = [
  "Condominium",
  "Townhouse",
  "SingleFamilyResidence",
  "UnimprovedLand",
] as const;

server.registerTool(
  "search_active_listings",
  {
    description:
      "Search active MLS property listings in rets_property with optional filters, pagination, and price-ascending ordering.",
    inputSchema: z.object({
      filters: z.object({
        city: z.string().optional(),
        maxPrice: z.number().nonnegative().finite().optional(),
        beds: z.number().nonnegative().finite().optional(),
        baths: z.number().nonnegative().finite().optional(),
        sqft: z.number().nonnegative().finite().optional(),
        type: z.enum(VALID_TYPES).optional(),
        pool: z.string().optional(),
        hasView: z.string().optional(),
      }),
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(50).default(10),
    }),
  },
  async ({ filters, page, limit }) => {
    try {
      const rows = await searchActiveListings(filters, page, limit);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("property-search MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
