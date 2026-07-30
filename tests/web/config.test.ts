import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/web/config.js";

describe("loadConfig (wdm v1 web)", () => {
  it("returns defaults for empty env object", () => {
    const cfg = loadConfig({});
    expect(cfg.serverUrl).toBe("https://rdp.local");
    expect(cfg.tlsSkipVerify).toBe(false);
    expect(cfg.auth).toEqual({ method: "none" });
  });

  it("parses RDP_ env keys from plain object", () => {
    const cfg = loadConfig({
      RDP_SERVER_URL: "https://wdm.example.com",
      RDP_CLIENT_ID: "my-id",
      RDP_CLIENT_SECRET: "my-secret",
    });
    expect(cfg.serverUrl).toBe("https://wdm.example.com");
    expect(cfg.auth).toEqual({
      method: "client_credentials",
      clientId: "my-id",
      clientSecret: "my-secret",
    });
  });

  it("parses Bearer auth key from plain object", () => {
    const cfg = loadConfig({
      RDP_SERVER_URL: "https://wdm.example.com",
      RDP_BEARER_TOKEN: "tok-123",
    });
    expect(cfg.serverUrl).toBe("https://wdm.example.com");
    expect(cfg.auth).toEqual({ method: "bearer", token: "tok-123" });
  });
});
