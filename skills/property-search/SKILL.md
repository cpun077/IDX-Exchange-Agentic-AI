---
name: property-search
description: Parse natural-language property searches into structured MLS filters, then query the database via MCP tools.
---

# Property Search

Convert property-search requests into structured JSON filters, then execute them against the MLS database through MCP tools.

## Workflow

1. Execute the TypeScript parser with the user's query.
2. Inspect its `status` and `filters`.
3. If `complete`, verify that all requested constraints were captured.
4. If `needs_interpretation`, or any constraint was missed, use the LLM to interpret the original query.
5. Strip `null` values from filters and call the appropriate MCP tool:
   - **Active listings:** `search_active_listings` with `{ filters, page?, limit? }`
   - **Sold comps / market history:** `get_sold_comps` with `{ city, months? }`
6. Return formatted results to the user.

## Result Limits

- If the user requests N listings, set MCP `limit` to N (maximum 50).
- Otherwise, default to 10 listings.
- Use `page: 1` unless the user requests additional results.
- Do not retrieve extra listings unless needed for the request.

## Parser Execution

Run the parser using the shell execution tool:

```bash
node ~/.openclaw/workspace/skills/property-search/scripts/text_parser.ts "<query>"
```

The script returns:
- `status`: "complete" or "needs_interpretation"
- `filters`: the eight-field JSON object

## MCP Tools

### search_active_listings

Queries `rets_property` for active listings with optional filters, pagination, and price-ascending ordering.

**Arguments:**
- `filters.city`: string (optional)
- `filters.maxPrice`: number >= 0 (optional)
- `filters.beds`: number >= 0 (optional, minimum)
- `filters.baths`: number >= 0 (optional, minimum)
- `filters.sqft`: number >= 0 (optional, minimum)
- `filters.type`: `"Condominium"` | `"Townhouse"` | `"SingleFamilyResidence"` | `"UnimprovedLand"` (optional)
- `filters.pool`: `"1"` for yes (optional)
- `filters.hasView`: `"1"` for yes (optional)
- `page`: positive integer, default 1
- `limit`: 1–50, default 10

### get_sold_comps

Queries `california_sold` for residential transactions in a city, ordered by close date descending (max 50 rows).

**Arguments:**
- `city`: string (required)
- `months`: 1–60, default 12

## Schema (Parser Output)

- `city`: string | null
- `maxPrice`: number | null (maximum)
- `beds`: number | null (minimum)
- `baths`: number | null (minimum)
- `sqft`: number | null (minimum)
- `type`: "Condominium" | "Townhouse" | "SingleFamilyResidence" | "UnimprovedLand" | null
- `pool`: "1" | null
- `hasView`: "1" | null

## Rules

- Prefer the parser's results when correct.
- Use `null` for unspecified fields; strip nulls before passing to MCP tools.
- Treat ordinary bedroom, bathroom, and sqft counts as minimums.
- Exclude optional preferences from mandatory filters.
- Never invent values or silently discard required constraints.
- Disclose unsupported required constraints; ask for clarification only when ambiguity materially changes the search.
- Return formatted property listings for search requests; return JSON filters only when explicitly requested.

## Error Handling

- MCP tools return `isError: true` with a message for invalid input or database errors.
- Empty results (0 rows) are valid — inform the user no matches were found, suggest broadening filters.
- Do not expose raw SQL errors to users; summarize the failure.

## Clarification Policy

- Prefer returning usable filters over asking unnecessary questions.
- Do not silently discard required constraints that the schema cannot represent.
- Return supported filters and explicitly disclose any unrepresented requirements.
- Treat approximate values ("around", "roughly", "about") as preferences, not strict minimums or maximums.
- Do not convert optional preferences into mandatory filters.
- Ask for clarification only when ambiguity materially changes the search scope or makes the filters misleading.
- For geographic phrases like "near" or "around" a city, clarify whether to search the city itself or surrounding areas.
- When processing multiple queries, handle each independently.
