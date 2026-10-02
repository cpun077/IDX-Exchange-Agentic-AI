# Conversational MLS Assistant Architecture

## Overview

Users ask
questions through WhatsApp; OpenClaw routes each request to the agent,
which uses the appropriate skill and tools to query MLS data and return
a natural-language response.

## Workflow

**User → WhatsApp → OpenClaw Runtime → Main Agent → LLM → Skill → Tool →
MLS Database → LLM → WhatsApp → User**

## Components

-   **WhatsApp:** User interface and messaging channel.
-   **OpenClaw Runtime:** Routes messages, sessions, skills, and tools.
-   **Main Agent:** Handles the conversation and coordinates each
    request.
-   **LLM:** Interprets intent, selects capabilities, and writes
    responses.
-   **Skills:** Instructions for tasks such as property search, sold
    comps, and market analysis.
-   **Tools:** Execute data retrieval and other actions.
-   **MLS Databases:** `rets_property` for property/listing data;
    `california_sold` for sold-property data.

## Example

**"Find 3-bedroom homes in Berkeley under \$1.5M."**

WhatsApp → OpenClaw → Agent/LLM → Property Search Skill → Database Tool
→ `rets_property` → LLM → WhatsApp
