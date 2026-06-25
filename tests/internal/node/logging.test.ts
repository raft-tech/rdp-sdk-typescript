import pino from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Must import after env manipulation for proper behavior.
// biome-ignore format: trailing comma in import() breaks esbuild parsing
let createLogger: typeof import("../../../src/internal/node/logging.js").createLogger;

describe("createLogger", () => {
  const originalEnv = process.env.SDK_LOG_LEVEL;

  beforeEach(async () => {
    process.env.SDK_LOG_LEVEL = undefined;
    // Re-import to pick up env changes.
    const mod = await import("../../../src/internal/node/logging.js");
    createLogger = mod.createLogger;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.SDK_LOG_LEVEL = originalEnv;
    } else {
      process.env.SDK_LOG_LEVEL = undefined;
    }
  });

  it("returns a silent logger with no args", () => {
    const logger = createLogger();
    expect(logger.level).toBe("silent");
  });

  it("returns the injected logger as-is", () => {
    const injected = pino({ level: "info" });
    const logger = createLogger(injected);
    expect(logger).toBe(injected);
  });

  it("reads SDK_LOG_LEVEL=debug", () => {
    process.env.SDK_LOG_LEVEL = "debug";
    const logger = createLogger();
    expect(logger.level).toBe("debug");
  });

  it("reads SDK_LOG_LEVEL=info", () => {
    process.env.SDK_LOG_LEVEL = "info";
    const logger = createLogger();
    expect(logger.level).toBe("info");
  });

  it("reads SDK_LOG_LEVEL=warn", () => {
    process.env.SDK_LOG_LEVEL = "warn";
    const logger = createLogger();
    expect(logger.level).toBe("warn");
  });

  it("reads SDK_LOG_LEVEL=error", () => {
    process.env.SDK_LOG_LEVEL = "error";
    const logger = createLogger();
    expect(logger.level).toBe("error");
  });

  it("ignores invalid env var value", () => {
    process.env.SDK_LOG_LEVEL = "verbose";
    const logger = createLogger();
    expect(logger.level).toBe("silent");
  });

  it("is case-insensitive for env var", () => {
    process.env.SDK_LOG_LEVEL = "DEBUG";
    const logger = createLogger();
    expect(logger.level).toBe("debug");
  });

  it("injected logger takes precedence over env var", () => {
    process.env.SDK_LOG_LEVEL = "error";
    const injected = pino({ level: "debug" });
    const logger = createLogger(injected);
    expect(logger).toBe(injected);
    expect(logger.level).toBe("debug");
  });
});
