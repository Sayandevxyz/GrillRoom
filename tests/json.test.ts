import { describe, it, expect } from "vitest";
import { parseLlmJson } from "../lib/llm/json";

describe("parseLlmJson 4-level fallback parser", () => {
  it("Level 1: parses clean JSON directly", () => {
    const input = '{"status": "ok", "count": 42}';
    expect(parseLlmJson(input)).toEqual({ status: "ok", count: 42 });
  });

  it("Level 2: extracts from ```json code fence", () => {
    const input = 'Here is the result:\n```json\n{"scores": {"directness": 8}, "dodged": false}\n```\nHope this helps!';
    expect(parseLlmJson(input)).toEqual({
      scores: { directness: 8 },
      dodged: false,
    });
  });

  it("Level 2: extracts from generic ``` code fence without language tag", () => {
    const input = '```\n{"category": "market", "severity": 4}\n```';
    expect(parseLlmJson(input)).toEqual({
      category: "market",
      severity: 4,
    });
  });

  it("Level 3: handles leading and trailing conversational text around braces", () => {
    const input = 'Sure, here is your analysis: {"reason": "Valid answer", "missing": []} -- End of analysis.';
    expect(parseLlmJson(input)).toEqual({
      reason: "Valid answer",
      missing: [],
    });
  });

  it("Level 4: handles nested braces and string values containing braces", () => {
    const input = 'Analyst Note: {"claim": "They said {we are profitable}", "nested": {"level": 2}}';
    expect(parseLlmJson(input)).toEqual({
      claim: "They said {we are profitable}",
      nested: { level: 2 },
    });
  });

  it("handles string with escaped quotes inside JSON", () => {
    const input = 'Prefix {"quote": "Founder said \\"we will raise $5M\\"", "valid": true} Suffix';
    expect(parseLlmJson(input)).toEqual({
      quote: 'Founder said "we will raise $5M"',
      valid: true,
    });
  });

  it("handles array payload with nested items", () => {
    const input = '{"items": [{"id": 1, "text": "Claim 1"}, {"id": 2, "text": "Claim 2"}]}';
    expect(parseLlmJson(input)).toEqual({
      items: [
        { id: 1, text: "Claim 1" },
        { id: 2, text: "Claim 2" },
      ],
    });
  });

  it("handles multi-line formatted messy text with spaces and tabs", () => {
    const input = `
      Result:
      {
        "conviction_deltas": {
          "rohan": -5,
          "meera": 10
        },
        "reason": "Clear market numbers"
      }
      Footnote: checked against ledger.
    `;
    expect(parseLlmJson(input)).toEqual({
      conviction_deltas: { rohan: -5, meera: 10 },
      reason: "Clear market numbers",
    });
  });

  it("returns null on completely invalid non-JSON text", () => {
    const input = "This is just plain English without any JSON object.";
    expect(parseLlmJson(input)).toBeNull();
  });

  it("returns null on empty, undefined or null input", () => {
    expect(parseLlmJson("")).toBeNull();
    expect(parseLlmJson(null)).toBeNull();
    expect(parseLlmJson(undefined)).toBeNull();
  });

  it("returns null on unclosed or corrupted braces", () => {
    const input = '{"reason": "broken object without closing brace';
    expect(parseLlmJson(input)).toBeNull();
  });
});
