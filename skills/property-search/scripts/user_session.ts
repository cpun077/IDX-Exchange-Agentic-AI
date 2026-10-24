
import type { ListingRow } from "./query_db.js";
import type { parsePropertyQuery } from "./text_parser.js";

type Parsed = ReturnType<typeof parsePropertyQuery>;
type Filters = Partial<{
    [K in keyof Parsed["filters"]]: NonNullable<Parsed["filters"][K]>
}>;

interface UserSession {
    filters: Filters;
    lastResults: ListingRow[];
    conversationStep: number;
}

const sessions = new Map<string, UserSession>();

export function getSession(id: string): UserSession {
    if (!sessions.has(id))
        sessions.set(id, { filters: {}, lastResults: [], conversationStep: 0 });
    return sessions.get(id)!;
}

export function updateSession(id: string, { filters, remove }: Parsed) {
    const session = getSession(id);

    Object.assign(session.filters,
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== null))
    );

    for (const key of remove) delete session.filters[key];

    session.conversationStep++;
    return session;
}

export function clearSession(id: string) {
    sessions.delete(id);
}

export function saveResults(id: string, results: ListingRow[]) {
    getSession(id).lastResults = results;
}