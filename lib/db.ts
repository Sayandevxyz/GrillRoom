import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

// In-memory fallback storage if DATABASE_URL is not set (e.g. initial scaffold/offline dev)
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
  return Boolean(databaseUrl && databaseUrl.startsWith("postgres"));
}

export function getDb() {
  if (isNeonConfigured()) {
    return neon(databaseUrl!);
  }
  return null;
}

export async function query<T = Record<string, unknown>>(
  sqlText: string,
  params: unknown[] = []
): Promise<T[]> {
  if (isNeonConfigured()) {
    try {
      const sql = neon(databaseUrl!);
      // Parameterized query execution
      const result = await sql(sqlText, params as (string | number | boolean | null)[]);
      return (result as unknown as T[]) || [];
    } catch (err) {
      console.error("[Database Query Error]", err);
      throw err;
    }
  }

  // Graceful fallback execution for in-memory development
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

  // Fallback placeholder
  return [] as T[];
}

export { mockDb };
