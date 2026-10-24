import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["--env-file=.env", "dist/mcp-server/src/server.js"],
  });

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);

  console.log("=== Tool Discovery ===");
  const { tools } = await client.listTools();
  for (const t of tools) {
    console.log(`  ${t.name}: ${t.description?.slice(0, 60)}...`);
  }

  console.log("\n=== search_active_listings: Irvine, maxPrice 1.5M, beds 3 ===");
  const r1 = await client.callTool({
    name: "search_active_listings",
    arguments: { filters: { city: "Irvine", maxPrice: 1500000, beds: 3 }, page: 1, limit: 3 },
  });
  const rows1 = JSON.parse((r1.content as any)[0].text);
  console.log(`  Returned ${rows1.length} rows`);
  for (const r of rows1) {
    console.log(`  ${r.L_Address}, ${r.L_City} — $${r.price} | ${r.beds}bd/${r.baths}ba`);
  }

  console.log("\n=== search_active_listings: Condo + Pool ===");
  const r2 = await client.callTool({
    name: "search_active_listings",
    arguments: { filters: { type: "Condominium", pool: "1" }, page: 1, limit: 3 },
  });
  const rows2 = JSON.parse((r2.content as any)[0].text);
  console.log(`  Returned ${rows2.length} rows`);
  for (const r of rows2) {
    console.log(`  ${r.L_Address}, ${r.L_City} — $${r.price} | Pool: ${r.PoolPrivateYN}`);
  }

  console.log("\n=== get_sold_comps: Irvine, 12 months ===");
  const r3 = await client.callTool({
    name: "get_sold_comps",
    arguments: { city: "Irvine", months: 12 },
  });
  const rows3 = JSON.parse((r3.content as any)[0].text);
  console.log(`  Returned ${rows3.length} rows`);
  for (const r of rows3.slice(0, 3)) {
    console.log(`  ${r.UnparsedAddress} — $${r.ClosePrice} on ${r.CloseDate}`);
  }

  console.log("\n=== search_active_listings: Nonexistent city ===");
  const r4 = await client.callTool({
    name: "search_active_listings",
    arguments: { filters: { city: "Nowheresville" } },
  });
  const rows4 = JSON.parse((r4.content as any)[0].text);
  console.log(`  Returned ${rows4.length} rows (expected 0)`);

  console.log("\n=== search_active_listings: Invalid negative price ===");
  const r5 = await client.callTool({
    name: "search_active_listings",
    arguments: { filters: { maxPrice: -500 } },
  });
  console.log(`  isError: ${r5.isError} — ${(r5.content as any)[0].text.slice(0, 80)}`);

  console.log("\n=== get_sold_comps: months > 60 ===");
  const r6 = await client.callTool({
    name: "get_sold_comps",
    arguments: { city: "Irvine", months: 120 },
  });
  console.log(`  isError: ${r6.isError} — ${(r6.content as any)[0].text.slice(0, 80)}`);

  await client.close();
  console.log("\n=== All tests complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
