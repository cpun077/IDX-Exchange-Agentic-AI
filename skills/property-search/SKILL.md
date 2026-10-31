---
name: property-search
description: Conversational MLS search, listing memory, and market statistics.
---

# Property Search

Use MCP tools for MLS searches and market analytics.

## Workflow

1. Use the current conversation ID as `sessionId`.
2. For listing searches, call `get_session({sessionId})`.
3. For new or changed filters, call `update_session({sessionId, queryText})`.
4. Select the appropriate tool:
   - `search_active_listings({sessionId, page?, limit?})` — active listings; updates `lastResults`.
   - `get_sold_comps({city, months?})` — sold listings.
   - `get_city_market_summary({city})` — 12-month market statistics.
   - `get_price_trend({city, months?})` — monthly trends (default 24 months).
5. Format MCP results for the user.
6. On reset, call `clear_session({sessionId})`.

## Session Rules

- Reuse `sessionId` within a conversation; isolate conversations.
- Preserve unspecified filters; update changed or explicitly cleared filters.
- Pass original user text to `update_session` when possible.
- Do not update sessions for market questions or questions about existing results.
- Use `lastResults` for ordinal references (1-based); avoid unnecessary searches.
- Interpret contextual requests; clarify material ambiguity.
- `conversationStep` counts updates, not messages.

## Filters

`city`, `maxPrice`, `beds`, `baths`, `sqft`, `type`, `pool`, `hasView`

- `beds`, `baths`, `sqft`: minimums; `maxPrice`: maximum.
- `type`: `Condominium` | `Townhouse` | `SingleFamilyResidence` | `UnimprovedLand`.
- `pool`, `hasView`: `"1"` when required; missing filters optional.

## Listing Results

- Default `limit: 10`, `page: 1`; maximum limit 50.
- Preserve filters when changing pagination or result count.
- Results sort by ascending price.
- Successful searches replace `lastResults`; failed searches preserve them.
- Show address, price, beds, baths, sqft, and relevant details.
- Suggest relaxing filters when no listings match.

## Market Statistics

- `get_city_market_summary({city})`: sold count, average/median close price, price/sqft, DOM, list-to-close %, active inventory, inventory-to-sales ratio, and YoY price change.
- `get_price_trend({city, months?})`: monthly sales, average price, DOM, and MoM price change.
- Use `months: 12` for 12-month trend requests.
- Use the requested city or established context; clarify if unknown.
- Market tools do not modify listing sessions.
- Distinguish average from median, MoM from YoY, and inventory from sales.
- Never invent metrics or give definitive investment advice.

## Restrictions

- Use MCP tools exclusively for session and database operations.
- Never run the parser or access MySQL directly.
- Never pass filters to `search_active_listings`; it reads session state.
- Do not substitute web results for MLS data.
- Summarize MCP errors without exposing SQL or credentials.
- Confirm session updates using MCP responses.