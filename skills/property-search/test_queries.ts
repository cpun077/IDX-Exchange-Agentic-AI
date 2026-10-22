import { searchActiveListings, getSoldComps } from "./query_db.js";

async function main() {
  console.log("=== Test 1: Active listings in Irvine, max $1.5M, 3+ beds ===");
  const results1 = await searchActiveListings({ city: "Irvine", maxPrice: 1500000, beds: 3 }, 1, 3);
  console.log(`Found ${results1.length} results`);
  for (const r of results1) {
    console.log(`  ${r.L_Address}, ${r.L_City} — $${r.price} | ${r.beds}bd/${r.baths}ba | ${r.sqft}sqft`);
  }

  console.log("\n=== Test 2: Active condos with pool ===");
  const results2 = await searchActiveListings({ type: "Condominium", pool: "True" }, 1, 3);
  console.log(`Found ${results2.length} results`);
  for (const r of results2) {
    console.log(`  ${r.L_Address}, ${r.L_City} — $${r.price} | ${r.type} | Pool: ${r.PoolPrivateYN}`);
  }

  console.log("\n=== Test 3: Sold comps in Irvine, last 12 months ===");
  const results3 = await getSoldComps("Irvine", 12);
  console.log(`Found ${results3.length} results`);
  for (const r of results3.slice(0, 3)) {
    console.log(`  ${r.UnparsedAddress} — Closed $${r.ClosePrice} on ${r.CloseDate} | ${r.BedroomsTotal}bd/${r.BathroomsTotalInteger}ba`);
  }

  console.log("\n=== Test 4: No filters (all active, page 1) ===");
  const results4 = await searchActiveListings({}, 1, 3);
  console.log(`Found ${results4.length} results`);
  for (const r of results4) {
    console.log(`  ${r.L_Address}, ${r.L_City} — $${r.price}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
