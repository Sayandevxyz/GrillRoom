/**
 * 4-Level Fallback JSON Parser for LLM outputs:
 * 1. Direct JSON.parse
 * 2. Markdown ```json code fence extraction
 * 3. Substring from first '{' to last '}'
 * 4. Balanced-brace scanner handling nested objects, arrays, and string escapes
 */

export function parseLlmJson<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Level 1: Direct JSON.parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // proceed to level 2
  }

  // Level 2: Extract from ```json or ``` code fences
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const fenceMatch = trimmed.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // proceed to level 3 with the extracted content or full string
    }
  }

  // Level 3: Substring from first '{' to last '}'
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sliced = candidate.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced) as T;
    } catch {
      // proceed to level 4
    }
  }

  // Level 4: Balanced-brace scanner handling nested objects, arrays, and string escapes
  try {
    const extracted = scanBalancedBraces(trimmed);
    if (extracted) {
      return JSON.parse(extracted) as T;
    }
  } catch {
    // Total failure
  }

  return null;
}

/**
 * Scans for the first balanced '{ ... }' block, taking string literals and escapes into account.
 */
function scanBalancedBraces(text: string): string | null {
  const startIdx = text.indexOf("{");
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return text.slice(startIdx, i + 1);
        }
      }
    }
  }

  return null;
}
