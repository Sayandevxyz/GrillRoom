import OpenAI from "openai";
import { logger } from "../logger";

export interface LlmCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
  stream?: boolean;
}

export class GroqApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "GroqApiError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_BIG_MODEL = process.env.GROQ_BIG_MODEL || "openai/gpt-oss-120b";
const DEFAULT_SMALL_MODEL = process.env.GROQ_SMALL_MODEL || "openai/gpt-oss-20b";

// Fallback chain in case models are unavailable on the endpoint
const BACKUP_BIG_MODELS = [DEFAULT_BIG_MODEL, "llama-3.3-70b-versatile", "mixtral-8x7b-32768"];
const BACKUP_SMALL_MODELS = [DEFAULT_SMALL_MODEL, "llama-3.1-8b-instant", "gemma2-9b-it"];

export function getGroqClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY || "missing-groq-key";
  const baseURL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

  return new OpenAI({
    apiKey,
    baseURL,
    timeout: 60000,
    dangerouslyAllowBrowser: true,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeLogMessage(msg: string): string {
  // Strip any API keys or tokens from logs
  return msg.replace(/gsk_[a-zA-Z0-9_-]+/g, "[REDACTED_API_KEY]");
}

/**
 * Execute chat completion with 2 retries (2s, 5s) for 429/5xx, and automatic fallback for big model calls.
 */
export async function createChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: LlmCallOptions = {}
): Promise<string> {
  const client = getGroqClient();
  const isBigModel = !options.model || options.model === DEFAULT_BIG_MODEL;
  const modelsToTry = isBigModel ? [...BACKUP_BIG_MODELS, ...BACKUP_SMALL_MODELS] : [...BACKUP_SMALL_MODELS];

  let lastError: unknown;

  for (const candidateModel of modelsToTry) {
    const retryDelays = [2000, 5000];
    let attempt = 0;

    while (attempt <= retryDelays.length) {
      try {
        const payload: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
          model: candidateModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_completion_tokens: options.maxTokens ?? 1024,
        };

        // Pass reasoning_effort if supported
        if (options.reasoningEffort) {
          (payload as unknown as Record<string, unknown>).reasoning_effort = options.reasoningEffort;
        }

        const response = await client.chat.completions.create(payload);
        const choice = response.choices[0];
        return choice?.message?.content || "";
      } catch (err: unknown) {
        lastError = err;
        const errorObj = err as { status?: number; statusCode?: number; message?: string };
        const status = errorObj?.status || errorObj?.statusCode;
        const errorMsg = sanitizeLogMessage(errorObj?.message || "Unknown error");

        logger.warn(
          `Groq API call warning: Model ${candidateModel}, Attempt ${attempt + 1}, Status ${status}: ${errorMsg}`,
          "createChatCompletion"
        );

        // Retry on 429 (rate limit) or 5xx server errors
        if ((status === 429 || (status !== undefined && status >= 500 && status < 600)) && attempt < retryDelays.length) {
          const waitTime = retryDelays[attempt];
          await delay(waitTime);
          attempt++;
          continue;
        }

        // If 404 (model not found) or unrecoverable error, break to try fallback model
        break;
      }
    }
  }

  throw new GroqApiError(
    `Groq LLM call failed after retries and fallbacks. ${sanitizeLogMessage(String(lastError))}`
  );
}

/**
 * Execute streamed chat completion (for investor speech SSE).
 */
export async function createStreamingChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: LlmCallOptions = {}
): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
  const client = getGroqClient();
  const modelsToTry = [options.model || DEFAULT_BIG_MODEL, ...BACKUP_BIG_MODELS, ...BACKUP_SMALL_MODELS];

  for (const candidateModel of modelsToTry) {
    try {
      const payload: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
        model: candidateModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_completion_tokens: options.maxTokens ?? 1024,
        stream: true,
      };

      if (options.reasoningEffort) {
        (payload as unknown as Record<string, unknown>).reasoning_effort = options.reasoningEffort;
      }

      return await client.chat.completions.create(payload);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "";
      logger.warn(
        `Groq stream fallback from model ${candidateModel}: ${sanitizeLogMessage(errorMsg)}`,
        "createStreamingChatCompletion"
      );
      // Try next model in fallback list
    }
  }

  throw new GroqApiError("All streaming model attempts failed.");
}

export { DEFAULT_BIG_MODEL, DEFAULT_SMALL_MODEL };
