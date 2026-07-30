import type { ClientRequest, IncomingMessage, RequestOptions } from "node:http";
import { PassThrough } from "node:stream";
import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:https", () => {
  const request = vi.fn();
  return { default: { request }, request };
});

describe("nodeFetch", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("strips API keys before following cross-origin redirects", async () => {
    const calls: Array<{ url: string; options?: RequestInit }> = [];
    globalThis.fetch = vi.fn(
      async (url: string | URL | Request, options?: RequestInit) => {
        calls.push({ url: String(url), options });
        if (calls.length === 1) {
          return new Response(null, {
            status: 302,
            headers: { location: "https://other.local/final" },
          });
        }
        return new Response('{"ok":true}', {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    ) as typeof fetch;

    const { nodeFetch } = await import("../../../src/internal/node/fetch.js");
    const response = await nodeFetch(false)("https://localhost/catalog", {
      headers: {
        Authorization: "Bearer token",
        Cookie: "session=abc",
        "X-API-Key": "key-123",
      },
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(calls.map((call) => call.url)).toEqual([
      "https://localhost/catalog",
      "https://other.local/final",
    ]);
    expect(calls[0].options?.redirect).toBe("manual");
    const redirectedHeaders = new Headers(calls[1].options?.headers);
    expect(redirectedHeaders.has("authorization")).toBe(false);
    expect(redirectedHeaders.has("cookie")).toBe(false);
    expect(redirectedHeaders.has("x-api-key")).toBe(false);
  });
});

type HttpsRequestImpl = ((
  options: RequestOptions,
  callback?: (res: IncomingMessage) => void,
) => ClientRequest) &
  typeof import("node:https").request;

function mockHttpsResponse(
  statusCode: number,
  body: Buffer = Buffer.from("{}"),
  onWrite?: (body: string | Buffer) => void,
  headers: Record<string, string> = { "content-type": "application/json" },
): HttpsRequestImpl {
  const impl = (
    _options: RequestOptions,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    const res = {
      statusCode,
      headers,
      on: vi.fn((event: string, handler: (chunk?: Buffer) => void) => {
        if (event === "data") handler(body);
        if (event === "end") handler();
      }),
    } as unknown as IncomingMessage;
    callback?.(res);
    return {
      on: vi.fn(),
      write: vi.fn((written: string | Buffer) => onWrite?.(written)),
      end: vi.fn(),
    } as unknown as ClientRequest;
  };
  return impl as HttpsRequestImpl;
}

function mockHttpsResponseSequence(
  responses: Array<{
    statusCode: number;
    statusMessage?: string;
    body?: Buffer;
    headers?: Record<string, string>;
  }>,
): {
  impl: HttpsRequestImpl;
  requests: RequestOptions[];
  writes: Array<string | Buffer>;
} {
  const requests: RequestOptions[] = [];
  const writes: Array<string | Buffer> = [];
  const impl = (
    options: RequestOptions,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    requests.push(options);
    const response = responses.shift();
    if (!response) {
      throw new Error("missing mock response");
    }
    const body = response.body ?? Buffer.from("{}");
    const res = {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      headers: response.headers ?? { "content-type": "application/json" },
      on: vi.fn((event: string, handler: (chunk?: Buffer) => void) => {
        if (event === "data") handler(body);
        if (event === "end") handler();
      }),
    } as unknown as IncomingMessage;
    callback?.(res);
    return {
      on: vi.fn(),
      write: vi.fn((written: string | Buffer) => writes.push(written)),
      end: vi.fn(),
    } as unknown as ClientRequest;
  };
  return { impl: impl as HttpsRequestImpl, requests, writes };
}

function mockHttpsStreamingResponse(
  statusCode: number,
  body: Buffer,
  headers: Record<string, string>,
): HttpsRequestImpl {
  const impl = (
    _options: RequestOptions,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    const res = new PassThrough() as PassThrough & IncomingMessage;
    res.statusCode = statusCode;
    res.headers = headers;
    callback?.(res);
    queueMicrotask(() => {
      res.end(body);
    });
    return {
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as ClientRequest;
  };
  return impl as HttpsRequestImpl;
}

function mockHttpsControlledStreamingResponse(
  headers: Record<string, string>,
): {
  impl: HttpsRequestImpl;
  write: (body: Buffer) => void;
  end: () => void;
} {
  let res: (PassThrough & IncomingMessage) | undefined;
  const impl = (
    _options: RequestOptions,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    res = new PassThrough() as PassThrough & IncomingMessage;
    res.statusCode = 200;
    res.headers = headers;
    callback?.(res);
    return {
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as ClientRequest;
  };
  return {
    impl: impl as HttpsRequestImpl,
    write: (body) => res?.write(body),
    end: () => res?.end(),
  };
}

function mockHttpsCancelableStreamingResponse(
  headers: Record<string, string>,
): {
  impl: HttpsRequestImpl;
  destroy: ReturnType<typeof vi.fn>;
  write: (body: Buffer) => void;
  end: () => void;
} {
  let res: (PassThrough & IncomingMessage) | undefined;
  const destroy = vi.fn();
  const impl = (
    _options: RequestOptions,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    res = new PassThrough() as PassThrough & IncomingMessage;
    res.statusCode = 200;
    res.headers = headers;
    const originalDestroy = res.destroy.bind(res);
    res.destroy = ((error?: Error) => {
      destroy(error);
      return originalDestroy(error);
    }) as typeof res.destroy;
    callback?.(res);
    return {
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as ClientRequest;
  };
  return {
    impl: impl as HttpsRequestImpl,
    destroy,
    write: (body) => res?.write(body),
    end: () => res?.end(),
  };
}

function mockHttpsStreamFailure(event: "aborted" | "error"): HttpsRequestImpl {
  const impl = (
    _options: RequestOptions,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    const res = {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      on: vi.fn(
        (
          registeredEvent: string,
          handler: ((chunk?: Buffer) => void) | ((err: Error) => void),
        ) => {
          if (registeredEvent === "error" && event === "error") {
            (handler as (err: Error) => void)(new Error("stream failed"));
          }
          if (registeredEvent === "aborted" && event === "aborted") {
            (handler as () => void)();
          }
        },
      ),
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

describe("nodeSkipVerifyFetch", () => {
  beforeEach(async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockReset();
  });

  it("serializes URLSearchParams before writing the request body", async () => {
    const https = await import("node:https");
    let writtenBody: string | Buffer | undefined;
    vi.mocked(https.request).mockImplementation(
      mockHttpsResponse(200, Buffer.from("{}"), (body) => {
        writtenBody = body;
      }),
    );

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    await nodeSkipVerifyFetch()("https://localhost/token", {
      method: "POST",
      body: new URLSearchParams({ client_id: "c", client_secret: "s" }),
    });

    expect(writtenBody).toBe("client_id=c&client_secret=s");
  });

  it("constructs bodyless responses for 204 and 205 statuses", async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockImplementation(
      mockHttpsResponse(204, Buffer.from("ignored")),
    );

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const response = await nodeSkipVerifyFetch()("https://localhost/delete", {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe("");
  });

  it("constructs bodyless responses for 304 status", async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockImplementation(
      mockHttpsResponse(304, Buffer.from("ignored")),
    );

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const response = await nodeSkipVerifyFetch()("https://localhost/cached");

    expect(response.status).toBe(304);
    await expect(response.text()).resolves.toBe("");
  });

  it("returns unencoded responses before the body stream ends", async () => {
    const https = await import("node:https");
    let data: ((chunk: Buffer) => void) | undefined;
    let end: (() => void) | undefined;
    const pause = vi.fn();
    const resume = vi.fn();
    const impl = (
      _options: RequestOptions,
      callback?: (res: IncomingMessage) => void,
    ): ClientRequest => {
      const res = {
        statusCode: 200,
        headers: { "content-type": "text/event-stream" },
        pause,
        resume,
        on: vi.fn((event: string, handler: (chunk?: Buffer) => void) => {
          if (event === "data") data = handler;
          if (event === "end") end = handler;
        }),
      } as unknown as IncomingMessage;
      callback?.(res);
      return {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ClientRequest;
    };
    vi.mocked(https.request).mockImplementation(impl as HttpsRequestImpl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const responsePromise = nodeSkipVerifyFetch()("https://localhost/events");
    const response = await Promise.race([
      responsePromise,
      new Promise<"pending">((resolve) => setTimeout(resolve, 20, "pending")),
    ]);

    expect(response).toBeInstanceOf(Response);
    expect(data).toBeTypeOf("function");
    expect(end).toBeTypeOf("function");

    data?.(Buffer.from("event: message\n"));
    expect(pause).toHaveBeenCalledTimes(1);

    const text = (response as Response).text();
    expect(resume).toHaveBeenCalled();
    data?.(Buffer.from("event: message\ndata: {}\n\n"));
    end?.();

    await expect(text).resolves.toBe(
      "event: message\nevent: message\ndata: {}\n\n",
    );
  });

  it("preserves HTTP status text", async () => {
    const https = await import("node:https");
    const sequence = mockHttpsResponseSequence([
      {
        statusCode: 503,
        statusMessage: "Service Unavailable",
        body: Buffer.from("unavailable"),
      },
    ]);
    vi.mocked(https.request).mockImplementation(sequence.impl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const response = await nodeSkipVerifyFetch()("https://localhost/catalog");

    expect(response.status).toBe(503);
    expect(response.statusText).toBe("Service Unavailable");
  });

  for (const { encoding, compress } of [
    { encoding: "gzip", compress: gzipSync },
    { encoding: "deflate", compress: deflateSync },
    { encoding: "br", compress: brotliCompressSync },
  ]) {
    it(`decodes ${encoding} response bodies`, async () => {
      const https = await import("node:https");
      const body = compress(Buffer.from('{"ok":true}'));
      vi.mocked(https.request).mockImplementation(
        mockHttpsStreamingResponse(200, body, {
          "content-encoding": encoding,
          "content-length": String(body.length),
          "content-type": "application/json",
        }),
      );

      const { nodeSkipVerifyFetch } = await import(
        "../../../src/internal/node/fetch.js"
      );
      const response = await nodeSkipVerifyFetch()("https://localhost/catalog");

      await expect(response.json()).resolves.toEqual({ ok: true });
      expect(response.headers.get("content-encoding")).toBeNull();
      expect(response.headers.get("content-length")).toBeNull();
    });
  }

  it("returns compressed responses before the body stream ends", async () => {
    const https = await import("node:https");
    const body = gzipSync(Buffer.from("event: message\ndata: {}\n\n"));
    const stream = mockHttpsControlledStreamingResponse({
      "content-encoding": "gzip",
      "content-length": String(body.length),
      "content-type": "text/event-stream",
    });
    vi.mocked(https.request).mockImplementation(stream.impl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const responsePromise = nodeSkipVerifyFetch()("https://localhost/events");
    const response = await Promise.race([
      responsePromise,
      new Promise<"pending">((resolve) => setTimeout(resolve, 20, "pending")),
    ]);

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get("content-encoding")).toBeNull();

    const text = (response as Response).text();
    stream.write(body);
    stream.end();

    await expect(text).resolves.toBe("event: message\ndata: {}\n\n");
  });

  it("rejects malformed compressed response bodies", async () => {
    const https = await import("node:https");
    const stream = mockHttpsCancelableStreamingResponse({
      "content-encoding": "gzip",
      "content-type": "application/json",
    });
    vi.mocked(https.request).mockImplementation(stream.impl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );

    const response = await nodeSkipVerifyFetch()("https://localhost/catalog");
    stream.write(Buffer.from("not gzip"));
    stream.end();

    await expect(response.text()).rejects.toThrow();
    expect(stream.destroy).toHaveBeenCalled();
  });

  it("destroys compressed response sources when body consumption is cancelled", async () => {
    const https = await import("node:https");
    const stream = mockHttpsCancelableStreamingResponse({
      "content-encoding": "gzip",
      "content-type": "text/event-stream",
    });
    vi.mocked(https.request).mockImplementation(stream.impl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );

    const response = await nodeSkipVerifyFetch()("https://localhost/events");
    const reason = new Error("done");
    await response.body?.cancel(reason);

    expect(stream.destroy).toHaveBeenCalledWith(reason);
  });

  it("follows relative redirects and rewrites POST 302 requests to GET", async () => {
    const https = await import("node:https");
    const sequence = mockHttpsResponseSequence([
      {
        statusCode: 302,
        headers: { location: "../token", "content-type": "text/plain" },
      },
      { statusCode: 200, body: Buffer.from('{"ok":true}') },
    ]);
    vi.mocked(https.request).mockImplementation(sequence.impl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const response = await nodeSkipVerifyFetch()(
      "https://localhost/oauth/authorize",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "client_id=c",
      },
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(sequence.requests.map((request) => request.path)).toEqual([
      "/oauth/authorize",
      "/token",
    ]);
    expect(sequence.requests[1].method).toBe("GET");
    expect(sequence.requests[1].headers).not.toHaveProperty("content-type");
    expect(sequence.writes).toEqual(["client_id=c"]);
  });

  it("preserves method and body for 307 redirects", async () => {
    const https = await import("node:https");
    const sequence = mockHttpsResponseSequence([
      { statusCode: 307, headers: { location: "./final" } },
      { statusCode: 200, body: Buffer.from('{"ok":true}') },
    ]);
    vi.mocked(https.request).mockImplementation(sequence.impl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const response = await nodeSkipVerifyFetch()("https://localhost/catalog", {
      method: "PUT",
      body: "payload",
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(sequence.requests.map((request) => request.path)).toEqual([
      "/catalog",
      "/final",
    ]);
    expect(sequence.requests[1].method).toBe("PUT");
    expect(sequence.writes).toEqual(["payload", "payload"]);
  });

  it("strips credentials before following cross-origin redirects", async () => {
    const https = await import("node:https");
    const sequence = mockHttpsResponseSequence([
      {
        statusCode: 302,
        headers: { location: "https://other.local/final" },
      },
      { statusCode: 200, body: Buffer.from('{"ok":true}') },
    ]);
    vi.mocked(https.request).mockImplementation(sequence.impl);

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );
    const response = await nodeSkipVerifyFetch()("https://localhost/catalog", {
      headers: {
        Authorization: "Bearer token",
        Cookie: "session=abc",
        "X-API-Key": "key-123",
      },
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(sequence.requests.map((request) => request.hostname)).toEqual([
      "localhost",
      "other.local",
    ]);
    expect(sequence.requests[1].headers).not.toHaveProperty("authorization");
    expect(sequence.requests[1].headers).not.toHaveProperty("cookie");
    expect(sequence.requests[1].headers).not.toHaveProperty("x-api-key");
  });

  it("rejects when the response stream errors", async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockImplementation(
      mockHttpsStreamFailure("error"),
    );

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );

    const response = await nodeSkipVerifyFetch()("https://localhost/broken");

    await expect(response.text()).rejects.toThrow("stream failed");
  });

  it("rejects when the response stream is aborted", async () => {
    const https = await import("node:https");
    vi.mocked(https.request).mockImplementation(
      mockHttpsStreamFailure("aborted"),
    );

    const { nodeSkipVerifyFetch } = await import(
      "../../../src/internal/node/fetch.js"
    );

    const response = await nodeSkipVerifyFetch()("https://localhost/aborted");

    await expect(response.text()).rejects.toThrow("response stream aborted");
  });
});
