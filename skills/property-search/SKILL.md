---
name: property-search
description: Parse natural-language property searches into structured MLS filters using a TypeScript parser.
---

# Property Search

Convert property-search requests into structured JSON.

## Workflow

1. Execute the TypeScript parser with the user's query.
2. Inspect its `status` and `filters`.
3. If `complete`, verify that all requested constraints were captured.
4. If `needs_interpretation`, or any constraint was missed, use the LLM to interpret the original query.
5. Return only the eight fields below. Never include `status` in the final output.

## Parser Execution

Run the parser using the shell execution tool:

```bash
node ~/.openclaw/workspace/skills/property-search/scripts/text_parser.ts "<query>"
```

Pass each property-search query as a command-line argument.

The script returns:
- `status`: "complete" or "needs_interpretation"
- `filters`: the eight-field JSON object

Use `filters` as the final output when parsing is complete.
If interpretation is needed, correct the filters using the original query.

For multiple queries, run the parser separately for each query.

## Schema

- `city`: string | null
- `maxPrice`: number | null (maximum)
- `beds`: number | null (minimum)
- `baths`: number | null (minimum)
- `sqft`: number | null (minimum)
- `type`: "Condominium" | "Townhouse" | "SingleFamilyResidence" | "UnimprovedLand" | null
- `pool`: "True" | null
- `hasView`: "True" | null

## Rules

- Prefer the parser's results when correct.
- Use `null` for unspecified fields.
- Treat ordinary bedroom, bathroom, and sqft counts as minimums.
- Exclude optional preferences from mandatory filters.
- Never invent values or silently discard required constraints.
- Ask for clarification if a required constraint cannot be represented.
- Do not query databases or generate SQL.
- Return valid JSON without explanation when all constraints are representable.

## Clarification Policy

- Prefer returning usable filters over asking unnecessary questions.
- Do not silently discard required constraints that the schema cannot represent.
- Return supported filters and explicitly disclose any unrepresented requirements.
- Treat approximate values ("around", "roughly", "about") as preferences, not strict minimums or maximums.
- Do not convert optional preferences into mandatory filters.
- Ask for clarification only when ambiguity materially changes the search scope or makes the filters misleading.
- For geographic phrases like "near" or "around" a city, clarify whether to search the city itself or surrounding areas.
- When processing multiple queries, handle each independently; do not block the entire batch because one query needs clarification.

