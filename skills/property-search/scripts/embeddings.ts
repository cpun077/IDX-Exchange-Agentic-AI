import OpenAI from "openai";
import { createHash } from "node:crypto";
import type { Pool, Connection, RowDataPacket } from "mysql2/promise";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const MODEL = "text-embedding-3-small";
const BATCH = 500;

type Database = Pool | Connection;

interface Listing extends RowDataPacket {
    L_ListingID: string;
    L_City: string;
    L_Type_: string;
    L_Remarks: string | null;
}

export async function embed(text: string): Promise<number[]> {
    const response = await client.embeddings.create({
        model: MODEL,
        input: text.replace(/\s+/g, " ").trim().slice(0, 8000),
    });

    if (!response.data?.[0]?.embedding) {
        throw new Error(`Unexpected response: ${JSON.stringify(response).slice(0, 500)}`);
    }

    return response.data[0].embedding;
}

export async function embedListing(listing: Listing) {
    const text = [listing.L_Type_, listing.L_City, listing.L_Remarks]
        .filter(Boolean).join(" ");
    return { id: listing.L_ListingID, text, vector: await embed(text) };
}

export async function embedAllListings(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS listing_embeddings (
      listing_id VARCHAR(255) PRIMARY KEY,
      embedding JSON NOT NULL,
      content_hash CHAR(64) NOT NULL
    )
  `);

  let lastId = "";
  let embedded = 0;
  let skipped = 0;

  while (true) {
    const [rows] = await db.execute<Listing[]>(`
      SELECT L_ListingID, L_City, L_Type_, L_Remarks
      FROM rets_property
      WHERE L_ListingID > ? AND L_Status = 'Active'
      ORDER BY L_ListingID
      LIMIT ${BATCH}
    `, [lastId]);

    if (!rows.length) break;
    lastId = rows[rows.length - 1].L_ListingID;

    // Find listings that need new embeddings
    const pending = [];

    for (const listing of rows) {
      const text = [listing.L_Type_, listing.L_City, listing.L_Remarks]
        .filter(Boolean).join(" ");

      if (!text.trim()) continue;

      const hash = createHash("sha256").update(text).digest("hex");

      const [existing] = await db.execute<RowDataPacket[]>(
        "SELECT content_hash FROM listing_embeddings WHERE listing_id = ?",
        [listing.L_ListingID]
      );

      if (existing[0]?.content_hash === hash) {
        skipped++;
        continue;
      }

      pending.push({
        id: listing.L_ListingID,
        text: text.replace(/\s+/g, " ").trim().slice(0, 8000),
        hash,
      });
    }

    // Embed all pending listings in ONE API request
    if (pending.length) {
      const response = await client.embeddings.create({
        model: MODEL,
        input: pending.map(p => p.text),
      });

      for (const item of response.data) {
        const p = pending[item.index];

        await db.execute(`
          INSERT INTO listing_embeddings (listing_id, embedding, content_hash)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            embedding = VALUES(embedding),
            content_hash = VALUES(content_hash)
        `, [p.id, JSON.stringify(item.embedding), p.hash]);

        embedded++;
      }
    }

    console.log(`Through ${lastId} | Embedded: ${embedded} | Skipped: ${skipped}`);
  }

  console.log(`Done! Embedded ${embedded}, skipped ${skipped}`);
}


export async function semanticSearch(
    db: Database,
    query: string,
    city?: string,
    topK = 10
) {
    const vector = await embed(query);

    const [rows] = await db.execute<RowDataPacket[]>(`
        SELECT
            r.L_ListingID,
            r.L_Address,
            r.L_City,
            r.L_SystemPrice,
            r.L_Keyword2 AS beds,
            r.LM_Dec_3 AS baths,
            r.LM_Int2_3 AS sqft,
            r.L_Type_,
            r.View,
            r.PoolPrivateYN,
            LEFT(r.L_Remarks, 300) AS remarks,
            e.embedding
        FROM rets_property r
        JOIN listing_embeddings e
            ON r.L_ListingID = e.listing_id
        WHERE r.L_Status = 'Active'
            AND (? IS NULL OR r.L_City = ?)
    `, [city ?? null, city ?? null]);

    const cosine = (a: number[], b: number[]) =>
        a.reduce((sum, x, i) => sum + x * b[i], 0) /
        (Math.hypot(...a) * Math.hypot(...b));

    return rows
        .map(({ embedding, ...listing }) => ({
            ...listing,
            score: cosine(
                vector,
                typeof embedding === "string"
                    ? JSON.parse(embedding)
                    : embedding
            ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}
