import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

describe("loadConfig (wdm v1 node)", () => {
  afterEach(() => {
    for (const key of [
      "RDP_SERVER_URL",
      "TLS_SKIP_VERIFY",
      "RDP_API_KEY",
      "RDP_CLIENT_ID",
      "RDP_CLIENT_SECRET",
      "RDP_BEARER_TOKEN",
    ]) {
      delete process.env[key];
    }
  });

  it("reads RDP_ env vars and returns validated config", async () => {
    process.env.RDP_SERVER_URL = "https://wdm.example.com:8443";
    process.env.RDP_API_KEY = "key-123";

    const { loadConfig } = await import("../../src/node/config.js");
    const cfg = loadConfig();

    expect(cfg.serverUrl).toBe("https://wdm.example.com:8443");
    expect(cfg.auth).toEqual({ method: "api_key", apiKey: "key-123" });
  });

  it("reads Bearer auth env var", async () => {
    process.env.RDP_BEARER_TOKEN = "tok-123";

    const { loadConfig } = await import("../../src/node/config.js");
    const cfg = loadConfig();

    expect(cfg.auth).toEqual({ method: "bearer", token: "tok-123" });
  });

  it("accepts custom env file path", async () => {
    const dotenv = await import("dotenv");
    const { loadConfig } = await import("../../src/node/config.js");

    loadConfig({ envPath: ".env.test" });

    expect(dotenv.config).toHaveBeenCalledWith({ path: ".env.test" });
  });

  it("returns defaults when no env vars set", async () => {
    const { loadConfig } = await import("../../src/node/config.js");
    const cfg = loadConfig();

    expect(cfg.serverUrl).toBe("https://rdp.local");
    expect(cfg.tlsSkipVerify).toBe(false);
    expect(cfg.auth).toEqual({ method: "none" });
  });
});

describe("fromNodeConfig (wdm v1)", () => {
  it("returns endpoint as first element", async () => {
    const { fromNodeConfig } = await import("../../src/node/config.js");
    const [endpoint] = fromNodeConfig({
      serverUrl: "https://wdm.example.com",
      tlsSkipVerify: false,
      auth: { method: "none" },
    });
    expect(endpoint).toBe("https://wdm.example.com");
  });

  it("includes WithTLSSkipVerify when tlsSkipVerify is true", async () => {
    const { fromNodeConfig } = await import("../../src/node/config.js");
    const { defaultOptions } = await import(
      "../../src/internal/node/options.js"
    );

    const [, ...opts] = fromNodeConfig({
      serverUrl: "https://rdp.local",
      tlsSkipVerify: true,
      auth: { method: "none" },
    });
    const o = defaultOptions();
    for (const opt of opts) opt(o);
    expect(o.tlsSkipVerify).toBe(true);
  });
});
