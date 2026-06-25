import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../../src/internal/logger.js";
import { createLogger } from "../../../src/internal/web/logging.js";

describe("createLogger (web)", () => {
  it("returns a silent (noop) logger with no args", () => {
    const logger = createLogger();
    // Should not throw when called.
    logger.debug({ test: true }, "msg");
    logger.info({ test: true }, "msg");
    logger.warn("msg");
    logger.error({ test: true }, "msg");
  });

  it("returns injected logger as-is", () => {
    const injected: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = createLogger(injected);
    expect(logger).toBe(injected);
  });

  it("silent logger methods are callable but produce no output", () => {
    const logger = createLogger();
    // These should all be no-ops — no throw, no output.
    expect(() => logger.debug({}, "test")).not.toThrow();
    expect(() => logger.info({}, "test")).not.toThrow();
    expect(() => logger.warn("test")).not.toThrow();
    expect(() => logger.error({}, "test")).not.toThrow();
  });

  it("returned logger satisfies Logger interface", () => {
    const logger: Logger = createLogger();
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});
