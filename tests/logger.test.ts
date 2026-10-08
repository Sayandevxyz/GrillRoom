import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("Structured Logger Suite (lib/logger)", () => {
  const originalEnv = process.env.NODE_ENV;
  const stdoutLogs: string[] = [];
  const stderrLogs: string[] = [];

  beforeEach(() => {
    stdoutLogs.length = 0;
    stderrLogs.length = 0;
    vi.spyOn(process.stdout, "write").mockImplementation((str) => {
      stdoutLogs.push(String(str));
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((str) => {
      stderrLogs.push(String(str));
      return true;
    });
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("remains silent when NODE_ENV === 'test'", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    logger.info("Test message", "TEST_CTX");
    logger.error("Error message", "TEST_CTX", new Error("Oops"));
    expect(stdoutLogs.length).toBe(0);
    expect(stderrLogs.length).toBe(0);
  });

  it("emits single-line JSON to stdout on info and debug when NODE_ENV === 'production'", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    logger.info("Server started", "Init", { port: 3000 });

    expect(stdoutLogs.length).toBe(1);
    const callArg = stdoutLogs[0];
    expect(callArg.endsWith("\n")).toBe(true);

    const parsed = JSON.parse(callArg.trim());
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Server started");
    expect(parsed.context).toBe("Init");
    expect(parsed.data.port).toBe(3000);
    expect(parsed.timestamp).toBeDefined();
  });

  it("emits single-line JSON to stderr on warn and error when NODE_ENV === 'production'", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const testError = new Error("Connection failed");
    logger.warn("Retrying query", "Database");
    logger.error("Failed query", "Database", testError, { queryId: "q_123" });

    expect(stderrLogs.length).toBe(2);

    const warnLog = JSON.parse(stderrLogs[0].trim());
    expect(warnLog.level).toBe("warn");
    expect(warnLog.message).toBe("Retrying query");

    const errLog = JSON.parse(stderrLogs[1].trim());
    expect(errLog.level).toBe("error");
    expect(errLog.message).toBe("Failed query");
    expect(errLog.data.message).toBe("Connection failed");
    expect(errLog.data.queryId).toBe("q_123");
  });

  it("redacts sensitive bearer tokens, API keys, and connection strings", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    logger.info("Calling Groq with Bearer gsk_secretApiKey12345", "Auth");

    const logged = stdoutLogs[0];
    expect(logged).not.toContain("gsk_secretApiKey12345");
    expect(logged).toContain("[REDACTED]");
  });

  it("handles non-Error objects safely in error method", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    logger.error("Non-standard exception", "Worker", "String error thrown");

    const errLog = JSON.parse(stderrLogs[0].trim());
    expect(errLog.level).toBe("error");
    expect(errLog.data.err).toBe("String error thrown");
  });
});
