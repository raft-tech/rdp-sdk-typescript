import * as http from "node:http";
import * as https from "node:https";
import { Readable, Transform } from "node:stream";
import {
  createBrotliDecompress,
  createGunzip,
  createInflate,
} from "node:zlib";

/** Fetch-compatible function used by the SDK's REST clients. */
export type FetchLike = (
  url: string,
  options?: RequestInit,
) => Promise<Response>;

type RequestOnce = (url: string, options: RequestInit) => Promise<Response>;

const MAX_REDIRECTS = 20;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Returns global fetch, or an HTTPS client that disables TLS verification. */
export function nodeFetch(tlsSkipVerify: boolean): FetchLike {
  const request = tlsSkipVerify ? skipVerifyRequestOnce : nativeRequestOnce;
  return async (url, options = {}) => requestWithRedirects(request, url, options, 0);
}

/**
 * node:https-based fetch adapter that disables TLS verification.
 * Intentionally supports the request body shapes emitted by this SDK.
 */
export function nodeSkipVerifyFetch(): FetchLike {
  return async (url, options = {}) =>
    requestWithRedirects(skipVerifyRequestOnce, url, options, 0);
}

async function requestWithRedirects(
  request: RequestOnce,
  url: string,
  options: RequestInit,
  redirectCount: number,
): Promise<Response> {
  const response = await request(url, options);
  if (!REDIRECT_STATUSES.has(response.status)) {
    return response;
  }

  const redirect = options.redirect ?? "follow";
  if (redirect === "manual") {
    return response;
  }
  if (redirect === "error") {
    throw new TypeError("rdp: redirect response received");
  }

  const location = response.headers.get("Location");
  if (location == null) {
    return response;
  }
  if (redirectCount >= MAX_REDIRECTS) {
    throw new TypeError("rdp: maximum redirect count exceeded");
  }

  await response.body?.cancel();
  const nextUrl = new URL(location, url);
  return requestWithRedirects(
    request,
    nextUrl.toString(),
    redirectOptions(options, response.status, new URL(url), nextUrl),
    redirectCount + 1,
  );
}

function nativeRequestOnce(url: string, options: RequestInit): Promise<Response> {
  return globalThis.fetch(url, { ...options, redirect: "manual" });
}

function skipVerifyRequestOnce(
  url: string,
  options: RequestInit,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const parsed = new URL(url);
    const reqModule = parsed.protocol === "https:" ? https : http;
    const headers = headersToRecord(options.headers);
    const bodyPromise = requestBodyToNodeBody(options.body);

    bodyPromise.then(
      (body) => {
        const requestOptions: http.RequestOptions & https.RequestOptions = {
          method: options.method,
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          headers,
          rejectUnauthorized: false,
        };
        if (options.signal != null) {
          requestOptions.signal = options.signal;
        }
        const req = reqModule.request(
          requestOptions,
          (res) => {
            const responseHeaders = headersFromIncomingMessage(res);
            const status = res.statusCode ?? 0;
            if (!hasResponseBody(status)) {
              res.resume?.();
              resolve(
                new Response(null, {
                  status,
                  statusText: res.statusMessage,
                  headers: responseHeaders,
                }),
              );
              return;
            }

            if (shouldDecodeResponseBody(responseHeaders)) {
              resolve(
                new Response(decodedIncomingMessageBody(res, responseHeaders), {
                  status,
                  statusText: res.statusMessage,
                  headers: responseHeaders,
                }),
              );
              return;
            }

            resolve(
              new Response(incomingMessageBody(res), {
                status,
                statusText: res.statusMessage,
                headers: responseHeaders,
              }),
            );
          },
        );
        req.on("error", reject);
        if (body !== undefined) {
          req.write(body);
        }
        req.end();
      },
      reject,
    );
  });
}

function headersFromIncomingMessage(res: http.IncomingMessage): Headers {
  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(res.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        responseHeaders.append(key, item);
      }
    } else if (value !== undefined) {
      responseHeaders.set(key, String(value));
    }
  }
  return responseHeaders;
}

function hasResponseBody(status: number): boolean {
  return status !== 204 && status !== 205 && status !== 304;
}

function shouldDecodeResponseBody(headers: Headers): boolean {
  const contentEncoding = headers.get("content-encoding");
  return (
    contentEncoding
      ?.split(",")
      .some((encoding) => {
        const normalized = encoding.trim().toLowerCase();
        return normalized !== "" && normalized !== "identity";
      }) ?? false
  );
}

function incomingMessageBody(
  res: http.IncomingMessage,
): ReadableStream<Uint8Array> {
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      res.on("data", (chunk: Buffer | string) => {
        if (closed) {
          return;
        }
        controller.enqueue(chunkToUint8Array(chunk));
        if ((controller.desiredSize ?? 1) <= 0) {
          res.pause?.();
        }
      });
      res.on("error", (err) => {
        if (closed) {
          return;
        }
        closed = true;
        controller.error(err);
      });
      res.on("aborted", () => {
        if (closed) {
          return;
        }
        closed = true;
        controller.error(new Error("rdp: response stream aborted"));
      });
      res.on("end", () => {
        if (closed) {
          return;
        }
        closed = true;
        controller.close();
      });
    },
    pull() {
      if (closed) {
        return;
      }
      res.resume?.();
    },
    cancel(reason) {
      closed = true;
      res.destroy?.(reason instanceof Error ? reason : undefined);
    },
  });
}

function decodedIncomingMessageBody(
  res: http.IncomingMessage,
  headers: Headers,
): ReadableStream<Uint8Array> {
  const transforms = decompressionTransforms(headers);
  if (!transforms) {
    return incomingMessageBody(res);
  }

  let stream: Readable = res;
  for (const transform of transforms) {
    stream = stream.pipe(transform);
  }
  const teardown = createStreamTeardown([res, ...transforms]);
  for (const source of [res, ...transforms.slice(0, -1)]) {
    source.once("error", teardown);
  }
  res.once("aborted", () =>
    teardown(new Error("rdp: response stream aborted")),
  );

  headers.delete("content-encoding");
  headers.delete("content-length");
  return readableBodyFromNode(stream, {
    onCancel: teardown,
    onError: teardown,
  });
}

function readableBodyFromNode(
  stream: Readable,
  options: {
    onCancel?: (reason?: unknown) => void;
    onError?: (err: Error) => void;
  } = {},
): ReadableStream<Uint8Array> {
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk: Buffer | string) => {
        if (closed) {
          return;
        }
        controller.enqueue(chunkToUint8Array(chunk));
        if ((controller.desiredSize ?? 1) <= 0) {
          stream.pause();
        }
      });
      stream.on("error", (err) => {
        if (closed) {
          return;
        }
        closed = true;
        options.onError?.(err);
        controller.error(err);
      });
      stream.on("end", () => {
        if (closed) {
          return;
        }
        closed = true;
        controller.close();
      });
    },
    pull() {
      if (closed) {
        return;
      }
      stream.resume();
    },
    cancel(reason) {
      closed = true;
      options.onCancel?.(reason);
    },
  });
}

function createStreamTeardown(
  streams: ReadonlyArray<Readable | Transform>,
): (reason?: unknown) => void {
  let tornDown = false;
  return (reason?: unknown) => {
    if (tornDown) {
      return;
    }
    tornDown = true;
    const error = reason instanceof Error ? reason : undefined;
    for (const stream of streams) {
      stream.destroy(error);
    }
  };
}

function decompressionTransforms(headers: Headers): Transform[] | undefined {
  const encodings = headers
    .get("content-encoding")
    ?.split(",")
    .map((encoding) => encoding.trim().toLowerCase())
    .filter((encoding) => encoding !== "");
  if (!encodings || encodings.length === 0) {
    return [];
  }

  const transforms: Transform[] = [];
  for (const encoding of encodings.reverse()) {
    if (encoding === "identity") {
      continue;
    }
    if (encoding === "gzip" || encoding === "x-gzip") {
      transforms.push(createGunzip());
    } else if (encoding === "deflate") {
      transforms.push(createInflate());
    } else if (encoding === "br") {
      transforms.push(createBrotliDecompress());
    } else {
      return undefined;
    }
  }
  return transforms;
}

function chunkToUint8Array(chunk: Buffer | string): Uint8Array {
  if (typeof chunk === "string") {
    return new TextEncoder().encode(chunk);
  }
  const body = new Uint8Array(chunk.byteLength);
  body.set(chunk);
  return body;
}

function redirectOptions(
  options: RequestInit,
  status: number,
  currentUrl: URL,
  nextUrl: URL,
): RequestInit {
  const method = (options.method ?? "GET").toUpperCase();
  const becomesGet =
    (status === 301 || status === 302) && method === "POST"
      ? true
      : status === 303 && method !== "GET" && method !== "HEAD";
  const crossOrigin = currentUrl.origin !== nextUrl.origin;
  if (!becomesGet && !crossOrigin) {
    return options;
  }

  const headers = new Headers(options.headers);
  if (crossOrigin) {
    headers.delete("authorization");
    headers.delete("cookie");
    headers.delete("cookie2");
    headers.delete("proxy-authorization");
    headers.delete("x-api-key");
  }
  headers.delete("content-length");
  if (becomesGet) {
    headers.delete("content-type");
  }
  return {
    ...options,
    method: becomesGet ? "GET" : options.method,
    body: becomesGet ? undefined : options.body,
    headers,
  };
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

async function requestBodyToNodeBody(
  body: BodyInit | null | undefined,
): Promise<string | Buffer | undefined> {
  if (body == null) {
    return undefined;
  }
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  throw new Error("rdp: unsupported request body for TLS skip-verify fetch");
}
