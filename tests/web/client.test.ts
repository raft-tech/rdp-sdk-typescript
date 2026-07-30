import { afterEach, describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/internal/logger.js";

describe("createClient (wdm v1 web)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function loadModule() {
    return import("../../src/web/client.js");
  }

  it("succeeds with a valid endpoint", async () => {
    const { createClient } = await loadModule();
    const client = createClient("http://localhost:8080");
    expect(client).toBeDefined();
    expect(client.objectService).toBeDefined();
    expect(client.actionService).toBeDefined();
    expect(client.catalog).toBeDefined();
    expect(client.pipelines).toBeDefined();
    expect(client.transformers).toBeDefined();
  });

  it("throws on empty endpoint", async () => {
    const { createClient } = await loadModule();
    expect(() => createClient("")).toThrow("rdp: endpoint is required");
  });

  it("uses default endpoint https://rdp.local when no endpoint given", async () => {
    const { createClient } = await loadModule();
    const { WithLogger } = await import("../../src/internal/options.js");

    const info = vi.fn();
    const logger: Logger = {
      info,
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const client = createClient(WithLogger(logger));
    expect(client).toBeDefined();
    expect(client.pipelines).toBeDefined();
    expect(client.transformers).toBeDefined();
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://rdp.local" }),
      "client initialized",
    );
  });

  it("throws when multiple auth methods are set", async () => {
    const { createClient } = await loadModule();
    const { WithClientCredentials, WithAPIKey } = await import(
      "../../src/internal/options.js"
    );
    expect(() =>
      createClient(
        "http://localhost:8080",
        WithClientCredentials("id", "secret"),
        WithAPIKey("key"),
      ),
    ).toThrowError(
      "rdp: multiple auth methods are set — provide exactly one auth method",
    );
  });

  it("rejects redirects for REST requests", async () => {
    const { createClient } = await loadModule();
    const { WithAPIKey } = await import("../../src/internal/options.js");
    const fetch = vi.fn(async () => Response.json([]));
    globalThis.fetch = fetch as typeof globalThis.fetch;

    const client = createClient(
      "https://rdp.example.com",
      WithAPIKey("ak-123"),
    );
    await client.catalog.dataSources.list();
    await client.pipelines.instances.list();
    await client.transformers.catalog.list();

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(init.redirect).toBe("error");
    const [, pipelinesInit] = fetch.mock.calls[1] as [string, RequestInit];
    expect(pipelinesInit.redirect).toBe("error");
    const [, transformersInit] = fetch.mock.calls[2] as [string, RequestInit];
    expect(transformersInit.redirect).toBe("error");
  });
});
