import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/internal/logger.js";
import {
  WithAPIKey,
  WithBearerToken,
  WithClientCredentials,
  WithFetch,
  WithLogger,
  WithTimeout,
  defaultOptions,
} from "../../src/internal/options.js";

describe("defaultOptions", () => {
  it("has no default timeout (opt-in only)", () => {
    expect(defaultOptions().timeout).toBeUndefined();
  });

  it("returns no client credentials", () => {
    expect(defaultOptions().clientCredentials).toBeUndefined();
  });

  it("returns no api key", () => {
    expect(defaultOptions().apiKey).toBeUndefined();
  });

  it("returns no bearer token", () => {
    expect(defaultOptions().bearerToken).toBeUndefined();
  });

  it("returns no logger", () => {
    expect(defaultOptions().logger).toBeUndefined();
  });

  it("returns no fetch override", () => {
    expect(defaultOptions().fetch).toBeUndefined();
  });
});

describe("functional options", () => {
  it("WithClientCredentials sets client credentials", () => {
    const opts = defaultOptions();
    WithClientCredentials("my-id", "my-secret")(opts);
    expect(opts.clientCredentials).toEqual({
      clientId: "my-id",
      clientSecret: "my-secret",
    });
  });

  it("WithAPIKey sets api key", () => {
    const opts = defaultOptions();
    WithAPIKey("key-123")(opts);
    expect(opts.apiKey).toBe("key-123");
  });

  it("WithBearerToken sets bearer token", () => {
    const opts = defaultOptions();
    WithBearerToken("tok-123")(opts);
    expect(opts.bearerToken).toBe("tok-123");
  });

  it("WithFetch sets fetch override", () => {
    const opts = defaultOptions();
    const fetch = vi.fn<typeof globalThis.fetch>();
    WithFetch(fetch)(opts);
    expect(opts.fetch).toBe(fetch);
  });

  it("WithTimeout sets custom timeout", () => {
    const opts = defaultOptions();
    WithTimeout(5_000)(opts);
    expect(opts.timeout).toBe(5_000);
  });

  it("WithLogger sets custom logger", () => {
    const opts = defaultOptions();
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    WithLogger(logger)(opts);
    expect(opts.logger).toBe(logger);
  });

  it("options apply in order (last wins)", () => {
    const opts = defaultOptions();
    WithTimeout(5_000)(opts);
    WithTimeout(10_000)(opts);
    expect(opts.timeout).toBe(10_000);
  });
});
