import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("⚠️  DATABASE_URL environment variable is not set.");
    console.warn("   To run migrations against Neon Postgres, provide DATABASE_URL=postgres://...");
    console.warn("   Skipping remote migration.");
    return;
  }

  console.log("🔌 Connecting to Neon database...");
  const sql = neon(databaseUrl);

  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  console.log("📄 Reading db/schema.sql...");

  // Execute schema definitions
  try {
    type NeonRawQuery = (query: string) => Promise<unknown>;
    // Split statements cleanly by semicolon
    const statements = schemaSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await (sql as unknown as NeonRawQuery)(statement);
    }
    console.log(`✅ Schema migration executed successfully (${statements.length} statements)!`);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigration().catch((err) => {
  console.error("Fatal error running migration:", err);
  process.exit(1);
});
