import { afterEach, describe, expect, it, vi } from "vitest";
import { webTokenFetcher } from "../../../src/internal/web/token-fetcher.js";

function makeTokenResponse(body: object, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

describe("webTokenFetcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs client credentials and returns parsed token response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeTokenResponse({
        access_token: "tok-abc",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const fetcher = webTokenFetcher();
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "cid",
      client_secret: "csec",
    });
    const result = await fetcher("https://rdp.local/api/v1/auth/token", body);

    expect(result).toEqual({ access_token: "tok-abc", expires_in: 3600 });
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, init] = mockFetch.mock.calls[0] as [
      string,
      RequestInit & { body: URLSearchParams },
    ];
    expect(url).toBe("https://rdp.local/api/v1/auth/token");
    expect(init.method).toBe("POST");
    // oauth4webapi's ClientSecretPost puts credentials in the URL-encoded body.
    const sent = new URLSearchParams(init.body as unknown as string);
    expect(sent.get("grant_type")).toBe("client_credentials");
    expect(sent.get("client_id")).toBe("cid");
    expect(sent.get("client_secret")).toBe("csec");
  });

  it("wires a 10s AbortSignal on the underlying fetch call", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        makeTokenResponse({ access_token: "t", token_type: "Bearer" }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const fetcher = webTokenFetcher();
    await fetcher(
      "https://rdp.local/api/v1/auth/token",
      new URLSearchParams({ client_id: "c", client_secret: "s" }),
    );

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.signal as AbortSignal).aborted).toBe(false);
  });

  it("rejects with RFC 6749 error details on an error response", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        makeTokenResponse(
          { error: "invalid_client", error_description: "bad creds" },
          { status: 401 },
        ),
      );
    vi.stubGlobal("fetch", mockFetch);

    const fetcher = webTokenFetcher();
    await expect(
      fetcher(
        "https://rdp.local/api/v1/auth/token",
        new URLSearchParams({ client_id: "c", client_secret: "s" }),
      ),
    ).rejects.toMatchObject({
      error: "invalid_client",
      error_description: "bad creds",
    });
  });
});
