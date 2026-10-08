import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseLlmJson } from "@/lib/llm/json";

const mockCreate = vi.fn();

// Mock openai
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

import {
  createChatCompletion,
  createStreamingChatCompletion,
  GroqApiError,
} from "@/lib/llm/groq";

describe("JSON Fallback Parser & LLM Client Edge Cases", () => {
  describe("parseLlmJson Robustness", () => {
    it("parses clean standard JSON payload", () => {
      const input = '{"status": "ok", "count": 42}';
      expect(parseLlmJson(input)).toEqual({ status: "ok", count: 42 });
    });

    it("parses JSON wrapped inside markdown code fences with language identifier", () => {
      const input = "Here is your data:\n```json\n{\"decision\": \"In\", \"score\": 85}\n```\nThank you.";
      expect(parseLlmJson(input)).toEqual({ decision: "In", score: 85 });
    });

    it("parses JSON wrapped inside raw markdown code fences without language tag", () => {
      const input = "```\n{\"directness\": 9, \"evidence\": 8}\n```";
      expect(parseLlmJson(input)).toEqual({ directness: 9, evidence: 8 });
    });

    it("extracts embedded JSON object surrounded by noisy conversational preface and suffix", () => {
      const input = "Certainly! Based on the metrics, here is the verdict:\n{\"verdict\": \"Conditional\", \"reason\": \"Needs unit audit\"}\nHope this helps your evaluation!";
      expect(parseLlmJson(input)).toEqual({ verdict: "Conditional", reason: "Needs unit audit" });
    });

    it("handles strings with escaped quotes inside values properly", () => {
      const input = '{"quote": "Founder said \\"we will raise $5M\\" in Seed", "valid": true}';
      expect(parseLlmJson(input)).toEqual({
        quote: 'Founder said "we will raise $5M" in Seed',
        valid: true,
      });
    });

    it("handles nested objects with internal curly brackets in values", () => {
      const input = '{"nested": {"formula": "CAC = S&M / NewCustomers", "bracketText": "{important}"}}';
      expect(parseLlmJson(input)).toEqual({
        nested: { formula: "CAC = S&M / NewCustomers", bracketText: "{important}" },
      });
    });

    it("returns null gracefully on completely invalid non-JSON plain text", () => {
      expect(parseLlmJson("I think the answer was good and showed strong revenue potential.")).toBeNull();
    });

    it("returns null gracefully on empty string, null, or undefined", () => {
      expect(parseLlmJson("")).toBeNull();
      expect(parseLlmJson(null)).toBeNull();
      expect(parseLlmJson(undefined)).toBeNull();
    });

    it("returns null on truncated / unclosed JSON syntax", () => {
      expect(parseLlmJson('{"status": "incomplete", "data": [1, 2, ')).toBeNull();
    });
  });

  describe("Groq Client Retry and Fallback Behaviour", () => {
    beforeEach(() => {
      mockCreate.mockReset();
    });

    it("returns content on successful first attempt", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "Direct response from model" } }],
      });

      const res = await createChatCompletion([{ role: "user", content: "Hello" }]);
      expect(res).toBe("Direct response from model");
    });

    it("retries on 429 rate limit error before succeeding", async () => {
      const rateLimitError = Object.assign(new Error("Rate limit exceeded"), { status: 429 });

      mockCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Success after retry" } }],
        });

      const res = await createChatCompletion([{ role: "user", content: "Hello" }]);
      expect(res).toBe("Success after retry");
    });

    it("falls back to backup models when candidate model returns 404", async () => {
      const notFoundError = Object.assign(new Error("Model not found"), { status: 404 });

      mockCreate
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Success from fallback model" } }],
        });

      const res = await createChatCompletion([{ role: "user", content: "Hello" }]);
      expect(res).toBe("Success from fallback model");
    });

    it("throws GroqApiError when all models fail in createChatCompletion", async () => {
      mockCreate.mockRejectedValue(new Error("Fatal connection failure"));
      await expect(
        createChatCompletion([{ role: "user", content: "Hello" }])
      ).rejects.toThrow(GroqApiError);
    });

    it("executes createStreamingChatCompletion successfully", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "chunk" } }] };
        },
      };
      mockCreate.mockResolvedValueOnce(mockStream);

      const stream = await createStreamingChatCompletion(
        [{ role: "user", content: "Stream" }],
        { reasoningEffort: "low" }
      );
      expect(stream).toBeDefined();
    });

    it("falls back to secondary model on stream error before succeeding", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "chunk" } }] };
        },
      };
      mockCreate
        .mockRejectedValueOnce(new Error("Model stream failed"))
        .mockResolvedValueOnce(mockStream);

      const stream = await createStreamingChatCompletion([
        { role: "user", content: "Stream" },
      ]);
      expect(stream).toBeDefined();
    });

    it("throws GroqApiError when all stream models fail", async () => {
      mockCreate.mockRejectedValue(new Error("All streaming models failed"));
      await expect(
        createStreamingChatCompletion([{ role: "user", content: "Stream" }])
      ).rejects.toThrow(GroqApiError);
    });
  });
});
