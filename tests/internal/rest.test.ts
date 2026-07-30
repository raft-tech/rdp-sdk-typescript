import { describe, expect, it, vi } from "vitest";
import type { TokenFetcher } from "../../src/internal/auth.js";
import type { Logger } from "../../src/internal/logger.js";
import { RestApiError, RestTransport } from "../../src/internal/rest.js";

const logger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function createTransport(fetch: typeof globalThis.fetch): RestTransport {
  return new RestTransport({
    endpoint: "https://rdp.example.com",
    basePath: "/api/v2/catalog",
    auth: { method: "api_key", apiKey: "ak-123" },
    tokenFetcher: async () => ({ access_token: "unused" }),
    logger,
    timeout: 1_000,
    fetch,
  });
}

function createClientCredentialsTransport(
  fetch: typeof globalThis.fetch,
  tokenFetcher: TokenFetcher,
): RestTransport {
  return new RestTransport({
    endpoint: "https://rdp.example.com",
    basePath: "/api/v2/catalog",
    auth: {
      method: "client_credentials",
      clientId: "client-id",
      clientSecret: "client-secret",
    },
    tokenFetcher,
    logger,
    timeout: 1_000,
    fetch,
  });
}

function createBearerTransport(fetch: typeof globalThis.fetch): RestTransport {
  return new RestTransport({
    endpoint: "https://rdp.example.com",
    basePath: "/api/v2/catalog",
    auth: { method: "bearer", token: "tok-123" },
    tokenFetcher: async () => ({ access_token: "unused" }),
    logger,
    timeout: 1_000,
    fetch,
  });
}

describe("RestTransport", () => {
  it("removes caller abort listeners after successful requests settle", async () => {
    const controller = new AbortController();
    const addEventListener = vi.spyOn(controller.signal, "addEventListener");
    const removeEventListener = vi.spyOn(
      controller.signal,
      "removeEventListener",
    );
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const transport = createTransport(fetch);

    await transport.request("GET", "/datasources", {
      signal: controller.signal,
    });

    const listener = addEventListener.mock.calls.find(
      ([event]) => event === "abort",
    )?.[1];
    expect(listener).toBeTypeOf("function");
    expect(removeEventListener).toHaveBeenCalledWith("abort", listener);
  });

  it("removes caller abort listeners after fetch errors", async () => {
    const controller = new AbortController();
    const addEventListener = vi.spyOn(controller.signal, "addEventListener");
    const removeEventListener = vi.spyOn(
      controller.signal,
      "removeEventListener",
    );
    const fetch = vi.fn(async () => {
      throw new Error("network failed");
    });
    const transport = createTransport(fetch);

    await expect(
      transport.request("GET", "/datasources", { signal: controller.signal }),
    ).rejects.toThrow("network failed");

    const listener = addEventListener.mock.calls.find(
      ([event]) => event === "abort",
    )?.[1];
    expect(listener).toBeTypeOf("function");
    expect(removeEventListener).toHaveBeenCalledWith("abort", listener);
  });

  it("parses JSON responses with case-insensitive media types", async () => {
    const fetch = vi.fn(
      async () =>
        new Response('{"ok":true}', {
          headers: { "Content-Type": "Application/Schema+JSON; charset=utf-8" },
        }),
    );
    const transport = createTransport(fetch);

    await expect(transport.request("GET", "/datasources")).resolves.toEqual({
      ok: true,
    });
  });

  it("preserves HTTP errors when JSON error bodies are malformed", async () => {
    const fetch = vi.fn(
      async () =>
        new Response("{not-json", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "Application/JSON" },
        }),
    );
    const transport = createTransport(fetch);

    let error: unknown;
    try {
      await transport.request("GET", "/datasources");
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(RestApiError);
    expect(error).toMatchObject({
      status: 503,
      statusText: "Service Unavailable",
      body: "{not-json",
    });
    expect((error as RestApiError).headers.get("Content-Type")).toBe(
      "Application/JSON",
    );
  });

  it("does not apply unary timeouts to raw streaming requests", async () => {
    const fetch = vi.fn(async () => new Response("event: ping\n\n"));
    const transport = createTransport(fetch);

    const response = await transport.requestRaw("GET", "/events");

    await expect(response.text()).resolves.toBe("event: ping\n\n");
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeUndefined();
  });

  it("passes caller cancellation to raw streaming requests", async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async () => new Response("event: ping\n\n"));
    const transport = createTransport(fetch);

    const response = await transport.requestRaw("GET", "/events", {
      signal: controller.signal,
    });

    await response.body?.cancel();
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it("passes request cancellation to OAuth token acquisition", async () => {
    const controller = new AbortController();
    const tokenFetcher = vi
      .fn<TokenFetcher>()
      .mockResolvedValue({ access_token: "tok-123" });
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const transport = createClientCredentialsTransport(fetch, tokenFetcher);

    await transport.request("GET", "/datasources", {
      signal: controller.signal,
    });

    const tokenSignal = tokenFetcher.mock.calls[0]?.[2];
    expect(tokenSignal).toBeInstanceOf(AbortSignal);
    expect(tokenSignal?.aborted).toBe(false);

    const requestHeaders = fetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(requestHeaders.get("Authorization")).toBe("Bearer tok-123");
  });

  it("sets static Bearer Authorization header", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const transport = createBearerTransport(fetch);

    await transport.request("GET", "/datasources");

    const requestHeaders = fetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(requestHeaders.get("Authorization")).toBe("Bearer tok-123");
  });

  it("keeps shared OAuth acquisition alive while another waiter remains", async () => {
    const first = new AbortController();
    const second = new AbortController();
    let resolveToken:
      | ((value: { access_token: string; expires_in?: number }) => void)
      | undefined;
    let tokenSignal: AbortSignal | undefined;
    const tokenFetcher = vi.fn<TokenFetcher>().mockImplementation(
      (_url, _body, signal) =>
        new Promise((resolve) => {
          tokenSignal = signal;
          resolveToken = resolve;
        }),
    );
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const transport = createClientCredentialsTransport(fetch, tokenFetcher);

    const firstRequest = transport.request("GET", "/datasources", {
      signal: first.signal,
    });
    const secondRequest = transport.request("GET", "/datasources", {
      signal: second.signal,
    });

    expect(tokenFetcher).toHaveBeenCalledTimes(1);
    first.abort();

    await expect(firstRequest).rejects.toThrow();
    expect(tokenSignal?.aborted).toBe(false);

    resolveToken?.({ access_token: "shared-token" });

    await expect(secondRequest).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("starts a new OAuth acquisition after every waiter cancels", async () => {
    const controller = new AbortController();
    let firstTokenSignal: AbortSignal | undefined;
    const tokenFetcher = vi
      .fn<TokenFetcher>()
      .mockImplementationOnce(
        (_url, _body, signal) =>
          new Promise(() => {
            firstTokenSignal = signal;
          }),
      )
      .mockResolvedValueOnce({ access_token: "replacement-token" });
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const transport = createClientCredentialsTransport(fetch, tokenFetcher);

    const firstRequest = transport.request("GET", "/datasources", {
      signal: controller.signal,
    });
    expect(tokenFetcher).toHaveBeenCalledTimes(1);

    controller.abort();

    await expect(firstRequest).rejects.toThrow();
    expect(firstTokenSignal?.aborted).toBe(true);

    await expect(transport.request("GET", "/datasources")).resolves.toEqual({
      ok: true,
    });

    expect(tokenFetcher).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not acquire OAuth tokens for already-aborted requests", async () => {
    const controller = new AbortController();
    controller.abort();
    const tokenFetcher = vi
      .fn<TokenFetcher>()
      .mockResolvedValue({ access_token: "tok-123" });
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const transport = createClientCredentialsTransport(fetch, tokenFetcher);

    await expect(
      transport.request("GET", "/datasources", { signal: controller.signal }),
    ).rejects.toThrow();

    expect(tokenFetcher).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
