import type { ClientRequest, IncomingMessage, RequestOptions } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:https", () => {
  const request = vi.fn();
  return { default: { request }, request };
});

function makeTokenResponse(body: object, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

// node:https.request has two overloads; the SDK only calls the
// (options, callback) form. Typing the mock impl as that single shape
// avoids needing `any` while still matching what vi.mocked() accepts.
type HttpsRequestImpl = ((
  options: RequestOptions,
  callback?: (res: IncomingMessage) => void,
) => ClientRequest) &
  typeof import("node:https").request;

function mockHttpsResponse(
  responseBody: object,
  statusCode = 200,
): HttpsRequestImpl {
  const impl = (
    _options: RequestOptions,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    const res = {
      statusCode,
      headers: { "content-type": "application/json" },
      on: vi.fn((event: string, handler: (chunk?: Buffer) => void) => {
        if (event === "data")
          handler(Buffer.from(JSON.stringify(responseBody)));
        if (event === "end") handler();
      }),
    } as unknown as IncomingMessage;
    callback?.(res);
    return {
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as ClientRequest;
  };
  return impl as HttpsRequestImpl;
}

describe("nodeTokenFetcher (tlsSkipVerify=false, delegates to global fetch)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs client credentials via globalThis.fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeTokenResponse({
        access_token: "tok-abc",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { nodeTokenFetcher } = await import(
      "../../../src/internal/node/token-fetcher.js"
    );
    const fetcher = nodeTokenFetcher(false);
    const result = await fetcher(
      "https://rdp.local/api/v1/auth/token",
      new URLSearchParams({ client_id: "c", client_secret: "s" }),
    );

    expect(result).toEqual({ access_token: "tok-abc", expires_in: 3600 });
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

describe("nodeTokenFetcher (tlsSkipVerify=true, routes through node:https)", () => {
  beforeEach(async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockReset();
  });

  it("uses node:https with rejectUnauthorized=false and parses the response", async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockImplementation(
      mockHttpsResponse({
        access_token: "tok-xyz",
        token_type: "Bearer",
        expires_in: 600,
      }),
    );

    const { nodeTokenFetcher } = await import(
      "../../../src/internal/node/token-fetcher.js"
    );
    const fetcher = nodeTokenFetcher(true);
    const result = await fetcher(
      "https://localhost:8443/api/v1/auth/token",
      new URLSearchParams({ client_id: "c", client_secret: "s" }),
    );

    expect(result).toEqual({ access_token: "tok-xyz", expires_in: 600 });
    const options = vi.mocked(https.request).mock.calls[0][0] as RequestOptions;
    expect(
      (options as { rejectUnauthorized?: boolean }).rejectUnauthorized,
    ).toBe(false);
    expect(options.method).toBe("POST");
    expect((options as { signal?: AbortSignal }).signal).toBeInstanceOf(
      AbortSignal,
    );
  });

  it("propagates RFC 6749 error responses from the token endpoint", async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockImplementation(
      mockHttpsResponse(
        { error: "invalid_client", error_description: "bad creds" },
        401,
      ),
    );

    const { nodeTokenFetcher } = await import(
      "../../../src/internal/node/token-fetcher.js"
    );
    const fetcher = nodeTokenFetcher(true);
    await expect(
      fetcher(
        "https://localhost:8443/api/v1/auth/token",
        new URLSearchParams({ client_id: "c", client_secret: "s" }),
      ),
    ).rejects.toMatchObject({
      error: "invalid_client",
      error_description: "bad creds",
    });
  });
});
