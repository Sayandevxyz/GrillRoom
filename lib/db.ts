import { neon } from "@neondatabase/serverless";

// In-memory fallback storage if DATABASE_URL is not set (for offline dev/tests)
interface MockDB {
  sessions: Map<string, Record<string, unknown>>;
  panel_members: Map<string, Record<string, unknown>>;
  turns: Record<string, unknown>[];
  claims: Record<string, unknown>[];
  evaluations: Record<string, unknown>[];
  convictions: Record<string, unknown>[];
  verdicts: Record<string, unknown>[];
  reports: Map<string, Record<string, unknown>>;
  behind_doors: Map<string, Record<string, unknown>>;
  knowledge_chunks: Record<string, unknown>[];
  rate_limits: Map<string, Record<string, unknown>>;
}

const mockDb: MockDB = {
  sessions: new Map(),
  panel_members: new Map(),
  turns: [],
  claims: [],
  evaluations: [],
  convictions: [],
  verdicts: [],
  reports: new Map(),
  behind_doors: new Map(),
  knowledge_chunks: [],
  rate_limits: new Map(),
};

export function isNeonConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && (url.startsWith("postgres://") || url.startsWith("postgresql://")));
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (isNeonConfigured() && url) {
    return neon(url);
  }
  return null;
}

export async function query<T = Record<string, unknown>>(
  sqlText: string,
  params: unknown[] = []
): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  const isProd = process.env.NODE_ENV === "production";

  // In production runtime requests, a missing or invalid DATABASE_URL throws a clear error
  if (isProd && !isNeonConfigured() && !process.env.CI && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("DATABASE_URL is not configured or invalid in production environment.");
  }

  if (isNeonConfigured() && url) {
    try {
      const sql = neon(url);
      const result = await sql(sqlText, params as (string | number | boolean | null)[]);
      return (result as unknown as T[]) || [];
    } catch (err) {
      console.error("[Database Query Error]", err);
      throw err;
    }
  }

  // Graceful fallback execution for in-memory development and testing
  return executeMockQuery<T>(sqlText, params);
}

function executeMockQuery<T>(sqlText: string, params: unknown[]): T[] {
  const normalized = sqlText.trim().toLowerCase();

  // Knowledge search fallback
  if (normalized.includes("from knowledge_chunks")) {
    let chunks = [...mockDb.knowledge_chunks];
    if (params.length > 0) {
      const kw = String(params[0]).toLowerCase();
      chunks = chunks.filter((c) => {
        const text = typeof c.text === "string" ? c.text.toLowerCase() : "";
        const cat = typeof c.category === "string" ? c.category.toLowerCase() : "";
        return text.includes(kw) || cat.includes(kw);
      });
    }
    return chunks.slice(0, 3) as unknown as T[];
  }

  // Session query fallback
  if (normalized.startsWith("select * from sessions where id =")) {
    const id = String(params[0]);
    const session = mockDb.sessions.get(id);
    return session ? ([session] as unknown as T[]) : [];
  }

  // Rate limits atomic upsert mock
  if (normalized.startsWith("insert into rate_limits")) {
    const key = String(params[0] || "");
    const windowStart = String(params[1] || "");
    const existing = mockDb.rate_limits.get(`${key}:${windowStart}`) as { count: number } | undefined;
    const count = existing ? existing.count + 1 : 1;
    mockDb.rate_limits.set(`${key}:${windowStart}`, { key, window_start: windowStart, count });
    return [{ count }] as unknown as T[];
  }

  // Fallback placeholder
  return [] as T[];
}

export { mockDb };
