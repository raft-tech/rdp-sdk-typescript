import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/internal/logger.js";

describe("createClient (wdm v1 node)", () => {
  async function loadModule() {
    return import("../../src/node/client.js");
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

  it("creates client with WithClientCredentials without throwing", async () => {
    const { createClient } = await loadModule();
    const { WithClientCredentials } = await import(
      "../../src/internal/options.js"
    );
    const client = createClient(
      "http://localhost:8080",
      WithClientCredentials("id", "secret"),
    );
    expect(client).toBeDefined();
    expect(client.pipelines).toBeDefined();
    expect(client.transformers).toBeDefined();
  });

  it("objectService and actionService accessors are defined", async () => {
    const { createClient } = await loadModule();
    const client = createClient("http://localhost:8080");
    expect(client.objectService).toBeDefined();
    expect(client.actionService).toBeDefined();
    expect(client.catalog).toBeDefined();
    expect(client.pipelines).toBeDefined();
    expect(client.transformers).toBeDefined();
  });

  it("emits the TLS-skip warning when WithTLSSkipVerify is set", async () => {
    const { createClient } = await loadModule();
    const { WithAPIKey, WithLogger } = await import(
      "../../src/internal/options.js"
    );
    const { WithTLSSkipVerify } = await import(
      "../../src/internal/node/options.js"
    );

    const warn = vi.fn();
    const logger: Logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn,
      error: vi.fn(),
    };

    createClient(
      "https://localhost:8443",
      WithAPIKey("ak-123"),
      WithTLSSkipVerify(),
      WithLogger(logger),
    );

    const tlsWarnings = warn.mock.calls.filter((call) =>
      String(call[1] ?? call[0]).includes(
        "TLS certificate verification disabled",
      ),
    );
    expect(tlsWarnings).toHaveLength(1);
  });
});
