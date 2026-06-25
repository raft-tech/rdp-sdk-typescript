import type { StreamRequest, UnaryRequest } from "@connectrpc/connect";
import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import {
  type TokenFetcher,
  apiKeyInterceptor,
  clientCredentialsInterceptor,
  userAgentInterceptor,
  validateAuth,
} from "../../src/internal/auth.js";
import { VERSION } from "../../src/internal/version.js";

const silentLogger = pino({ level: "silent" });

function makeReq(): UnaryRequest {
  return {
    header: new Headers(),
    stream: false as const,
    service: { typeName: "test.Service" },
    method: { name: "Test" },
  } as unknown as UnaryRequest;
}

describe("validateAuth", () => {
  it("throws when both clientCredentials and apiKey are set", () => {
    expect(() =>
      validateAuth(
        {
          clientCredentials: { clientId: "a", clientSecret: "b" },
          apiKey: "key",
        },
        silentLogger,
      ),
    ).toThrowError(
      "rdp: both clientCredentials and apiKey are set — provide exactly one auth method",
    );
  });

  it("warns when no auth configured", () => {
    const warn = vi.fn();
    const logger = {
      warn,
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    } as unknown as pino.Logger;
    validateAuth({}, logger);
    expect(warn).toHaveBeenCalledWith("rdp: no auth configured");
  });

  it("warns for empty apiKey and warns no auth configured", () => {
    const warn = vi.fn();
    const logger = {
      warn,
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    } as unknown as pino.Logger;
    validateAuth({ apiKey: "  " }, logger);
    expect(warn).toHaveBeenCalledWith("rdp: api_key is empty, ignoring");
    expect(warn).toHaveBeenCalledWith("rdp: no auth configured");
  });

  it("does not throw for clientCredentials only", () => {
    expect(() =>
      validateAuth(
        { clientCredentials: { clientId: "a", clientSecret: "b" } },
        silentLogger,
      ),
    ).not.toThrow();
  });

  it("does not throw for apiKey only", () => {
    expect(() =>
      validateAuth({ apiKey: "key-123" }, silentLogger),
    ).not.toThrow();
  });

  it("does not throw when clientCredentials set with empty apiKey", () => {
    expect(() =>
      validateAuth(
        {
          clientCredentials: { clientId: "a", clientSecret: "b" },
          apiKey: "",
        },
        silentLogger,
      ),
    ).not.toThrow();
  });

  it("returns client_credentials auth unchanged regardless of TLS mode", () => {
    // TLS verification is orthogonal to auth; validateAuth no longer sees
    // tls_skip_verify. The TLS-skip warning is emitted by the client layer.
    const result = validateAuth(
      { clientCredentials: { clientId: "a", clientSecret: "b" } },
      silentLogger,
    );
    expect(result).toEqual({
      method: "client_credentials",
      clientId: "a",
      clientSecret: "b",
    });
  });

  it("returns api_key auth unchanged regardless of TLS mode", () => {
    const result = validateAuth({ apiKey: "k-123" }, silentLogger);
    expect(result).toEqual({ method: "api_key", apiKey: "k-123" });
  });
});

describe("userAgentInterceptor", () => {
  it("sets User-Agent header on request", async () => {
    const interceptor = userAgentInterceptor();
    const req = makeReq();
    const mockNext = vi.fn().mockResolvedValue({ ok: true });
    await interceptor(mockNext)(req);
    expect(req.header.get("User-Agent")).toBe(`rdp-sdk-typescript/${VERSION}`);
    expect(mockNext).toHaveBeenCalledWith(req);
  });
});

describe("apiKeyInterceptor", () => {
  it("sets X-API-Key header on request", async () => {
    const interceptor = apiKeyInterceptor("my-key");
    const req = makeReq();
    const mockNext = vi.fn().mockResolvedValue({ ok: true });
    await interceptor(mockNext)(req);
    expect(req.header.get("X-API-Key")).toBe("my-key");
    expect(mockNext).toHaveBeenCalledWith(req);
  });
});

describe("clientCredentialsInterceptor", () => {
  it("fetches token on first call and sets Authorization", async () => {
    const fetchToken = vi
      .fn<TokenFetcher>()
      .mockResolvedValue({ access_token: "tok-123" });
    const interceptor = clientCredentialsInterceptor(
      "id",
      "secret",
      "https://h/token",
      fetchToken,
      silentLogger,
    );
    const req = makeReq();
    const mockNext = vi.fn().mockResolvedValue({ ok: true });
    await interceptor(mockNext)(req);
    expect(req.header.get("Authorization")).toBe("Bearer tok-123");
    expect(fetchToken).toHaveBeenCalledOnce();
  });

  it("sends grant_type, client_id, client_secret in body", async () => {
    const fetchToken = vi
      .fn<TokenFetcher>()
      .mockResolvedValue({ access_token: "t" });
    const interceptor = clientCredentialsInterceptor(
      "cid",
      "csec",
      "https://h/token",
      fetchToken,
      silentLogger,
    );
    await interceptor(vi.fn().mockResolvedValue({}))(makeReq());
    const body = fetchToken.mock.calls[0][1] as URLSearchParams;
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("cid");
    expect(body.get("client_secret")).toBe("csec");
  });

  it("honors server expires_in for cache TTL (minus 10s delta)", async () => {
    vi.useFakeTimers();
    try {
      const fetchToken = vi
        .fn<TokenFetcher>()
        .mockResolvedValueOnce({ access_token: "tok1", expires_in: 60 })
        .mockResolvedValueOnce({ access_token: "tok2", expires_in: 60 });
      const interceptor = clientCredentialsInterceptor(
        "id",
        "s",
        "https://h/t",
        fetchToken,
        silentLogger,
      );
      const next = vi.fn().mockResolvedValue({});

      await interceptor(next)(makeReq());
      // effective TTL = (60 - 10)s = 50_000ms; 49s → still cached
      vi.advanceTimersByTime(49_000);
      await interceptor(next)(makeReq());
      expect(fetchToken).toHaveBeenCalledTimes(1);

      // Advance past the effective TTL → re-fetch
      vi.advanceTimersByTime(2_000);
      const req = makeReq();
      await interceptor(next)(req);
      expect(fetchToken).toHaveBeenCalledTimes(2);
      expect(req.header.get("Authorization")).toBe("Bearer tok2");
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to 300s default when server omits expires_in", async () => {
    vi.useFakeTimers();
    try {
      const fetchToken = vi
        .fn<TokenFetcher>()
        .mockResolvedValue({ access_token: "tok" });
      const interceptor = clientCredentialsInterceptor(
        "id",
        "s",
        "https://h/t",
        fetchToken,
        silentLogger,
      );
      const next = vi.fn().mockResolvedValue({});

      await interceptor(next)(makeReq());
      // effective TTL = (300 - 10)s = 290_000ms; 289s → still cached
      vi.advanceTimersByTime(289_000);
      await interceptor(next)(makeReq());
      expect(fetchToken).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2_000);
      await interceptor(next)(makeReq());
      expect(fetchToken).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to default when expires_in is non-positive", async () => {
    vi.useFakeTimers();
    try {
      const fetchToken = vi
        .fn<TokenFetcher>()
        .mockResolvedValue({ access_token: "tok", expires_in: 0 });
      const interceptor = clientCredentialsInterceptor(
        "id",
        "s",
        "https://h/t",
        fetchToken,
        silentLogger,
      );
      const next = vi.fn().mockResolvedValue({});

      await interceptor(next)(makeReq());
      vi.advanceTimersByTime(289_000);
      await interceptor(next)(makeReq());
      expect(fetchToken).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deduplicates concurrent token fetches", async () => {
    let resolveToken: ((val: { access_token: string }) => void) | undefined;
    const fetchToken = vi.fn<TokenFetcher>().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveToken = resolve;
        }),
    );
    const interceptor = clientCredentialsInterceptor(
      "id",
      "s",
      "https://h/t",
      fetchToken,
      silentLogger,
    );
    const next = vi.fn().mockResolvedValue({});

    // Fire two concurrent requests while cache is cold
    const p1 = interceptor(next)(makeReq());
    const p2 = interceptor(next)(makeReq());

    // Only one fetch should be in-flight
    expect(fetchToken).toHaveBeenCalledTimes(1);

    // Resolve the single fetch
    resolveToken?.({ access_token: "shared-tok" });
    await Promise.all([p1, p2]);

    // Both should have completed
    expect(next).toHaveBeenCalledTimes(2);
    // Still only one fetch
    expect(fetchToken).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed in-flight fetch", async () => {
    const fetchToken = vi
      .fn<TokenFetcher>()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ access_token: "retry-tok" });
    const interceptor = clientCredentialsInterceptor(
      "id",
      "s",
      "https://h/t",
      fetchToken,
      silentLogger,
    );
    const next = vi.fn().mockResolvedValue({});

    // First call fails
    await expect(interceptor(next)(makeReq())).rejects.toThrow("fail");

    // Second call should retry (inflight cleared on error)
    const req = makeReq();
    await interceptor(next)(req);
    expect(req.header.get("Authorization")).toBe("Bearer retry-tok");
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it("propagates token fetch errors", async () => {
    const fetchToken = vi
      .fn<TokenFetcher>()
      .mockRejectedValue(new Error("network down"));
    const interceptor = clientCredentialsInterceptor(
      "id",
      "s",
      "https://h/t",
      fetchToken,
      silentLogger,
    );
    await expect(
      interceptor(vi.fn().mockResolvedValue({}))(makeReq()),
    ).rejects.toThrow("network down");
  });
});
