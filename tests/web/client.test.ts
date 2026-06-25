import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/internal/logger.js";

describe("createClient (wdm v1 web)", () => {
  async function loadModule() {
    return import("../../src/web/client.js");
  }

  it("succeeds with a valid endpoint", async () => {
    const { createClient } = await loadModule();
    const client = createClient("http://localhost:8080");
    expect(client).toBeDefined();
    expect(client.objectService).toBeDefined();
    expect(client.actionService).toBeDefined();
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
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://rdp.local" }),
      "client initialized",
    );
  });

  it("throws when both auth methods are set", async () => {
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
      "rdp: both clientCredentials and apiKey are set — provide exactly one auth method",
    );
  });
});
