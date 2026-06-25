import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/internal/logger.js";

describe("Logger interface", () => {
  it("is satisfiable by a plain object", () => {
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    expect(logger).toBeDefined();
  });

  it("has debug, info, warn, error methods", () => {
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    logger.debug({ procedure: "test" }, "msg");
    logger.info({ endpoint: "http://localhost" }, "msg");
    logger.warn("warning");
    logger.error({ error: "fail" }, "msg");

    expect(logger.debug).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
