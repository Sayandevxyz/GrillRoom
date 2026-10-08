import { query } from "../db";

export interface KnowledgeSnippet {
  id: number;
  source: string;
  category: string;
  persona_tag: string;
  text: string;
}

/**
 * Retrieves up to 2 rubric snippets matching the category and persona tag via Postgres full-text search.
 */
export async function getRubricSnippets(
  category: string,
  personaTag?: string,
  searchTerms?: string
): Promise<string[]> {
  try {
    const term = searchTerms || category;
    let sqlText = `
      SELECT text FROM knowledge_chunks
      WHERE (category ILIKE $1 OR tsv @@ websearch_to_tsquery('english', $2))
    `;
    const params: (string | number)[] = [`%${category}%`, term];

    if (personaTag && personaTag !== "all") {
      sqlText += ` AND (persona_tag = $3 OR persona_tag = 'all')`;
      params.push(personaTag);
    }

    sqlText += ` LIMIT 2`;

    const rows = await query<{ text: string }>(sqlText, params);
    if (rows && rows.length > 0) {
      return rows.map((r) => r.text);
    }
  } catch (err) {
    console.warn("[Rubric Retrieval Warning]", err);
  }

  // Graceful fallback: return general VC principle
  return [
    `Validate core assumptions with hard unit data. Do not accept top-down generalizations or unverified conversion rates.`,
  ];
}
