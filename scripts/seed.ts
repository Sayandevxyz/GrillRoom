import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { INVESTOR_PERSONAS } from "../lib/engine/personas";
import { mockDb } from "../lib/db";

interface ParsedChunk {
  source: string;
  category: string;
  persona_tag: string;
  text: string;
}

function parseMarkdownFile(filePath: string): ParsedChunk {
  const content = fs.readFileSync(filePath, "utf-8");
  const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  let category = "general";
  let persona_tag = "all";
  let source = "general VC practice";
  let text = content.trim();

  if (frontMatterMatch) {
    const rawYaml = frontMatterMatch[1];
    text = frontMatterMatch[2].trim();

    for (const line of rawYaml.split(/\r?\n/)) {
      const [key, ...rest] = line.split(":");
      if (!key || rest.length === 0) continue;
      const k = key.trim();
      const val = rest.join(":").trim().replace(/^["']|["']$/g, "");
      if (k === "category") category = val;
      if (k === "persona_tag") persona_tag = val;
      if (k === "source") source = val;
    }
  }

  return { source, category, persona_tag, text };
}

async function runSeed() {
  const knowledgeDir = path.join(process.cwd(), "db", "seed", "knowledge");
  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".md"));

  const chunks: ParsedChunk[] = files.map((file) =>
    parseMarkdownFile(path.join(knowledgeDir, file))
  );

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith("postgres")) {
    console.log("🔌 Seeding Neon Postgres database...");
    const sql = neon(databaseUrl);

    type NeonTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
    const sqlTag = sql as unknown as NeonTag;

    // 1. Seed panel_members
    console.log("👥 Seeding panel_members table...");
    for (const persona of Object.values(INVESTOR_PERSONAS)) {
      await sqlTag`
        INSERT INTO panel_members (id, name, archetype, priority_weights, distrusts, style_notes, signature_question)
        VALUES (${persona.id}, ${persona.name}, ${persona.archetype}, ${JSON.stringify(persona.priorityWeights)}, ${persona.distrusts}, ${persona.styleNotes}, ${persona.signatureQuestion})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          archetype = EXCLUDED.archetype,
          priority_weights = EXCLUDED.priority_weights,
          distrusts = EXCLUDED.distrusts,
          style_notes = EXCLUDED.style_notes,
          signature_question = EXCLUDED.signature_question
      `;
    }

    // 2. Seed knowledge_chunks
    console.log(`📚 Seeding ${chunks.length} knowledge_chunks...`);
    await sqlTag`DELETE FROM knowledge_chunks`;
    for (const chunk of chunks) {
      await sqlTag`
        INSERT INTO knowledge_chunks (source, category, persona_tag, text)
        VALUES (${chunk.source}, ${chunk.category}, ${chunk.persona_tag}, ${chunk.text})
      `;
    }

    console.log("✅ Seed completed successfully on Neon database!");
    console.log(`📊 Total Panel Members: ${Object.keys(INVESTOR_PERSONAS).length}`);
    console.log(`📊 Total Knowledge Chunks: ${chunks.length}`);
  } else {
    console.log("ℹ️  DATABASE_URL is not set. Seeding in-memory registry for local development / testing...");

    for (const persona of Object.values(INVESTOR_PERSONAS)) {
      mockDb.panel_members.set(persona.id, persona as unknown as Record<string, unknown>);
    }
    mockDb.knowledge_chunks = chunks.map((c, idx) => ({ id: idx + 1, ...c } as Record<string, unknown>));

    console.log("✅ In-memory mock database seeded successfully!");
    console.log(`📊 Total Panel Members seeded: ${mockDb.panel_members.size}`);
    console.log(`📊 Total Knowledge Chunks seeded: ${mockDb.knowledge_chunks.length}`);
  }
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
