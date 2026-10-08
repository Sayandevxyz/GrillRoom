/**
 * Structured Logger for GrillRoom
 * Provides single-line JSON logging, redacts sensitive keys/secrets,
 * and remains silent when NODE_ENV === "test".
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /gsk_[a-zA-Z0-9]+/gi,
  /owner_token=[^;\s]+/gi,
  /postgres(ql)?:\/\/[^@]+@/gi,
  /"(apiKey|password|secret|token|cookie)":\s*"[^"]+"/gi,
];

function redactSensitiveData(text: string): string {
  let redacted = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

function safeStringify(obj: unknown): string {
  try {
    return redactSensitiveData(JSON.stringify(obj));
  } catch {
    return "[Unserializable]";
  }
}

export const logger = {
  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "test") return;
    const payload: LogPayload = {
      level: "debug",
      message: redactSensitiveData(message),
      context,
      data,
      timestamp: new Date().toISOString(),
    };
    process.stdout.write(`${safeStringify(payload)}\n`);
  },

  info(message: string, context?: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "test") return;
    const payload: LogPayload = {
      level: "info",
      message: redactSensitiveData(message),
      context,
      data,
      timestamp: new Date().toISOString(),
    };
    process.stdout.write(`${safeStringify(payload)}\n`);
  },

  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "test") return;
    const payload: LogPayload = {
      level: "warn",
      message: redactSensitiveData(message),
      context,
      data,
      timestamp: new Date().toISOString(),
    };
    process.stderr.write(`${safeStringify(payload)}\n`);
  },

  error(message: string, context?: string, err?: unknown, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "test") return;
    const errorDetails =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : { err: String(err) };
    const payload: LogPayload = {
      level: "error",
      message: redactSensitiveData(message),
      context,
      data: { ...data, ...errorDetails },
      timestamp: new Date().toISOString(),
    };
    process.stderr.write(`${safeStringify(payload)}\n`);
  },
};
