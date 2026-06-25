import { describe, expect, it, vi } from "vitest";
import {
  type RdpConfig,
  fromConfig,
  validateConfig,
} from "../../src/internal/config.js";
import type { Logger } from "../../src/internal/logger.js";
import { defaultOptions } from "../../src/internal/options.js";

function mockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger & {
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };
}

describe("validateConfig", () => {
  it("returns defaults when nothing is set", () => {
    const logger = mockLogger();
    const cfg = validateConfig({}, logger);
    expect(cfg.serverUrl).toBe("https://rdp.local");
    expect(cfg.tlsSkipVerify).toBe(false);
    expect(cfg.auth).toEqual({ method: "none" });
    expect(logger.warn).toHaveBeenCalledWith("rdp: no auth configured");
  });

  it("parses server URL", () => {
    const cfg = validateConfig(
      { serverUrl: "https://wdm.example.com:8443" },
      mockLogger(),
    );
    expect(cfg.serverUrl).toBe("https://wdm.example.com:8443");
  });

  it("overrides port in server URL with serverPort", () => {
    const cfg = validateConfig(
      { serverUrl: "https://rdp.local", serverPort: "8443" },
      mockLogger(),
    );
    expect(cfg.serverUrl).toBe("https://rdp.local:8443");
  });

  it("overrides existing port in server URL with serverPort", () => {
    const cfg = validateConfig(
      { serverUrl: "https://rdp.local:443", serverPort: "8443" },
      mockLogger(),
    );
    expect(cfg.serverUrl).toBe("https://rdp.local:8443");
  });

  it("ignores empty serverPort", () => {
    const cfg = validateConfig(
      { serverUrl: "https://rdp.local:9090", serverPort: "  " },
      mockLogger(),
    );
    expect(cfg.serverUrl).toBe("https://rdp.local:9090");
  });

  it("throws on non-numeric serverPort", () => {
    expect(() => validateConfig({ serverPort: "abc" }, mockLogger())).toThrow(
      "rdp: invalid RDP_SERVER_PORT",
    );
  });

  it("throws on invalid server URL", () => {
    expect(() =>
      validateConfig({ serverUrl: "not-a-url" }, mockLogger()),
    ).toThrow("rdp: invalid RDP_SERVER_URL");
  });

  it("parses tlsSkipVerify from string", () => {
    const cfg = validateConfig({ tlsSkipVerify: "true" }, mockLogger());
    expect(cfg.tlsSkipVerify).toBe(true);
  });

  it("defaults tlsSkipVerify to false", () => {
    const cfg = validateConfig({}, mockLogger());
    expect(cfg.tlsSkipVerify).toBe(false);
  });

  it("resolves valid client credentials", () => {
    const cfg = validateConfig(
      { clientId: "my-id", clientSecret: "my-secret" },
      mockLogger(),
    );
    expect(cfg.auth).toEqual({
      method: "client_credentials",
      clientId: "my-id",
      clientSecret: "my-secret",
    });
  });

  it("resolves valid API key", () => {
    const cfg = validateConfig({ apiKey: "key-123" }, mockLogger());
    expect(cfg.auth).toEqual({ method: "api_key", apiKey: "key-123" });
  });

  it("throws when both auth methods are set", () => {
    expect(() =>
      validateConfig(
        { clientId: "id", clientSecret: "sec", apiKey: "key" },
        mockLogger(),
      ),
    ).toThrow(
      "rdp: both clientCredentials and apiKey are set — provide exactly one auth method",
    );
  });

  it("warns and falls through on partial client credentials", () => {
    const logger = mockLogger();
    const cfg = validateConfig({ clientId: "my-id" }, logger);
    expect(cfg.auth).toEqual({ method: "none" });
    expect(logger.warn).toHaveBeenCalledWith(
      "rdp: incomplete client credentials, ignoring",
    );
  });

  it("warns and falls through when clientSecret set without clientId", () => {
    const logger = mockLogger();
    const cfg = validateConfig({ clientSecret: "sec" }, logger);
    expect(cfg.auth).toEqual({ method: "none" });
    expect(logger.warn).toHaveBeenCalledWith(
      "rdp: incomplete client credentials, ignoring",
    );
  });

  it("treats empty/whitespace strings as not set", () => {
    const logger = mockLogger();
    const cfg = validateConfig({ apiKey: "  ", clientId: "" }, logger);
    expect(cfg.auth).toEqual({ method: "none" });
    expect(logger.warn).toHaveBeenCalledWith("rdp: no auth configured");
  });

  it("flows client credentials through insecure mode", () => {
    const logger = mockLogger();
    const cfg = validateConfig(
      {
        tlsSkipVerify: "true",
        clientId: "id",
        clientSecret: "sec",
      },
      logger,
    );
    expect(cfg.tlsSkipVerify).toBe(true);
    expect(cfg.auth).toEqual({
      method: "client_credentials",
      clientId: "id",
      clientSecret: "sec",
    });
    // validateConfig must not emit the TLS-skip warning — that is the
    // responsibility of the client constructor, which has visibility into
    // the transport being built.
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("TLS certificate"),
    );
  });

  it("flows apiKey through insecure mode", () => {
    const logger = mockLogger();
    const cfg = validateConfig(
      { tlsSkipVerify: "true", apiKey: "key" },
      logger,
    );
    expect(cfg.auth).toEqual({ method: "api_key", apiKey: "key" });
  });

  // D4 — RDP_SERVER_URL component validation
  const rejectCases: Array<{ name: string; url: string }> = [
    { name: "path", url: "https://host.example.com/base" },
    { name: "deep path", url: "https://host.example.com/api/v1" },
    { name: "query", url: "https://host.example.com?foo=bar" },
    { name: "fragment", url: "https://host.example.com#frag" },
    { name: "userinfo full", url: "https://user:pass@host.example.com" },
    { name: "userinfo user only", url: "https://user@host.example.com" },
  ];

  for (const { name, url } of rejectCases) {
    it(`rejects serverUrl with ${name}`, () => {
      expect(() => validateConfig({ serverUrl: url }, mockLogger())).toThrow(
        /rdp: invalid RDP_SERVER_URL/,
      );
    });
  }

  it("accepts a trailing root slash (trimmed)", () => {
    const cfg = validateConfig(
      { serverUrl: "https://host.example.com/" },
      mockLogger(),
    );
    expect(cfg.serverUrl).toBe("https://host.example.com");
  });
});

describe("fromConfig", () => {
  it("returns serverUrl as the first element (endpoint)", () => {
    const cfg: RdpConfig = {
      serverUrl: "https://wdm.example.com:8443",
      tlsSkipVerify: false,
      auth: { method: "none" },
    };
    const [endpoint] = fromConfig(cfg);
    expect(endpoint).toBe("https://wdm.example.com:8443");
  });

  it("preserves URL path in endpoint", () => {
    const cfg: RdpConfig = {
      serverUrl: "https://gateway.internal/wdm",
      tlsSkipVerify: false,
      auth: { method: "none" },
    };
    const [endpoint] = fromConfig(cfg);
    expect(endpoint).toBe("https://gateway.internal/wdm");
  });

  it("maps client_credentials auth to WithClientCredentials option", () => {
    const cfg: RdpConfig = {
      serverUrl: "https://rdp.local",
      tlsSkipVerify: false,
      auth: {
        method: "client_credentials",
        clientId: "id",
        clientSecret: "sec",
      },
    };
    const [, ...opts] = fromConfig(cfg);
    const o = defaultOptions();
    for (const opt of opts) opt(o);
    expect(o.clientCredentials).toEqual({
      clientId: "id",
      clientSecret: "sec",
    });
  });

  it("maps api_key auth to WithAPIKey option", () => {
    const cfg: RdpConfig = {
      serverUrl: "https://rdp.local",
      tlsSkipVerify: false,
      auth: { method: "api_key", apiKey: "key-123" },
    };
    const [, ...opts] = fromConfig(cfg);
    const o = defaultOptions();
    for (const opt of opts) opt(o);
    expect(o.apiKey).toBe("key-123");
  });

  it("returns no auth options for method none", () => {
    const cfg: RdpConfig = {
      serverUrl: "https://rdp.local",
      tlsSkipVerify: false,
      auth: { method: "none" },
    };
    const [, ...opts] = fromConfig(cfg);
    expect(opts).toHaveLength(0);
  });
});
