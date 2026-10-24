---
name: property-search
description: Conversational MLS search with persistent filters and listing memory.
---

# Property Search

Search MLS listings conversationally using MCP tools. Preserve filters and results across messages.

## Workflow

1. Use the current conversation ID as `sessionId`.
2. Call `get_session(sessionId)` to retrieve filters and previous results.
3. For new or modified search constraints, call `update_session({sessionId, queryText})`. Parsing and merging happen internally.
4. Search using:
   - `search_active_listings({sessionId, page?, limit?})` — uses saved filters and automatically replaces `lastResults`.
   - `get_sold_comps({city, months?})` — sold history.
5. Format results for the user.
6. For "start over" or "reset", call `clear_session(sessionId)`.

## Session Rules

- Reuse `sessionId` within a conversation; isolate separate conversations.
- Preserve unspecified filters; override changed values; remove explicitly cleared constraints.
- Pass the user's original message to `update_session` when possible.
- Use LLM interpretation for contextual or ambiguous requests.
- Do not call `update_session` for questions about existing results.
- Use `lastResults` for references like "the second listing" (1-based indexing).
- Do not search again when saved results suffice.
- `conversationStep` counts session updates, not messages.
- Ask for clarification only when ambiguity materially affects the search.
- Never invent or silently discard required constraints.

## Filters

`city`, `maxPrice`, `beds`, `baths`, `sqft`, `type`, `pool`, `hasView`

- `beds`, `baths`, `sqft`: minimums.
- `maxPrice`: maximum.
- `type`: `Condominium` | `Townhouse` | `SingleFamilyResidence` | `UnimprovedLand`.
- `pool`, `hasView`: `"1"` when required.
- Missing filters are optional.

## Results

- Default `limit: 10`, `page: 1`.
- If N requested, set `limit: N` (max 50).
- Preserve filters when changing only pagination or result count.
- Active listings are sorted by ascending price.
- Successful searches replace `lastResults`, including empty results.
- Failed searches preserve previous results.
- Show address, price, beds, baths, sqft, and relevant details.
- For no matches, suggest relaxing constraints.
- Summarize MCP errors without exposing SQL details.

## Restrictions

- Use MCP tools for all session and database operations.
- Never execute the parser separately; `update_session` handles parsing.
- Never pass filters directly to `search_active_listings`; it reads session filters.
- Never access MySQL, credentials, or `query_db.ts` directly.
- Do not substitute web results for MLS data.
- Confirm updates using MCP responses.
