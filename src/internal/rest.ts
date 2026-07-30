import {
  type ResolvedAuth,
  type TokenProvider,
  type TokenFetcher,
  bearerAuthHeader,
  clientCredentialsTokenProvider,
} from "./auth.js";
import type { Logger } from "./logger.js";
import { VERSION } from "./version.js";

const USER_AGENT = `rdp-sdk-typescript/${VERSION}`;
const JSON_CONTENT_TYPE = "application/json";

export type FetchLike = (
  url: string,
  options?: RequestInit,
) => Promise<Response>;

export interface RestTransportOptions {
  endpoint: string;
  basePath: string;
  auth: ResolvedAuth;
  tokenFetcher: TokenFetcher;
  logger: Logger;
  timeout?: number;
  fetch: FetchLike;
}

export interface RestRequestOptions {
  query?: Record<string, unknown>;
  queryArrayFormat?: "repeat" | "comma";
  body?: unknown;
  contentType?: string;
  accept?: string;
  signal?: AbortSignal;
  headers?: HeadersInit;
}

interface RestFetchResult {
  response: Response;
  cleanup: () => void;
}

interface RequestSignal {
  signal?: AbortSignal;
  cleanup: () => void;
}

interface ParseResponseBodyOptions {
  preserveInvalidJson?: boolean;
}

export class RestApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly body: unknown;

  constructor(response: Response, body: unknown) {
    super(`rdp: request failed with HTTP ${response.status}`);
    this.name = "RestApiError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.body = body;
  }
}

export class RestTransport {
  private readonly getBearerToken?: TokenProvider;

  constructor(private readonly options: RestTransportOptions) {
    if (options.auth.method === "client_credentials") {
      this.getBearerToken = clientCredentialsTokenProvider(
        options.auth.clientId,
        options.auth.clientSecret,
        `${options.endpoint}/api/v1/auth/token`,
        options.tokenFetcher,
        options.logger,
      );
    }
  }

  async request<T>(
    method: string,
    path: string,
    options: RestRequestOptions = {},
  ): Promise<T> {
    const result = await this.fetch(method, path, options);
    try {
      const body = await parseResponseBody(result.response, {
        preserveInvalidJson: !result.response.ok,
      });

      if (!result.response.ok) {
        throw new RestApiError(result.response, body);
      }

      return body as T;
    } finally {
      result.cleanup();
    }
  }

  async requestVoid(
    method: string,
    path: string,
    options: RestRequestOptions = {},
  ): Promise<void> {
    const result = await this.fetch(method, path, options);
    try {
      const body = await parseResponseBody(result.response, {
        preserveInvalidJson: !result.response.ok,
      });

      if (!result.response.ok) {
        throw new RestApiError(result.response, body);
      }
    } finally {
      result.cleanup();
    }
  }

  async requestRaw(
    method: string,
    path: string,
    options: RestRequestOptions = {},
  ): Promise<Response> {
    const result = await this.fetch(method, path, options, {
      timeout: false,
    });
    if (!result.response.ok) {
      try {
        const body = await parseResponseBody(result.response, {
          preserveInvalidJson: true,
        });
        throw new RestApiError(result.response, body);
      } finally {
        result.cleanup();
      }
    }

    return responseWithCleanup(result.response, result.cleanup);
  }

  async count(path: string, options: RestRequestOptions = {}): Promise<number> {
    const result = await this.fetch("HEAD", path, options);
    try {
      const body = await parseResponseBody(result.response, {
        preserveInvalidJson: !result.response.ok,
      });

      if (!result.response.ok) {
        throw new RestApiError(result.response, body);
      }

      const count = result.response.headers.get("Count");
      if (count == null) {
        throw new Error("rdp: missing Count header");
      }

      const parsed = Number(count);
      if (!Number.isInteger(parsed)) {
        throw new Error(`rdp: invalid Count header ${JSON.stringify(count)}`);
      }
      return parsed;
    } finally {
      result.cleanup();
    }
  }

  private async fetch(
    method: string,
    path: string,
    options: RestRequestOptions,
    behavior: { timeout: boolean } = { timeout: true },
  ): Promise<RestFetchResult> {
    const url = this.buildUrl(path, options.query, options.queryArrayFormat);
    const requestSignal = behavior.timeout
      ? withTimeout(options.signal, this.options.timeout)
      : { signal: options.signal, cleanup: noop };

    this.options.logger.debug({ method, path }, "rest request");
    try {
      const headers = await this.buildHeaders(options, requestSignal.signal);
      const body = serializeRequestBody(options.body, options.contentType);
      const response = await this.options.fetch(url, {
        method,
        headers,
        body,
        signal: requestSignal.signal,
      });
      this.options.logger.debug(
        { method, path, status: response.status },
        "rest response",
      );
      return { response, cleanup: requestSignal.cleanup };
    } catch (err) {
      requestSignal.cleanup();
      this.options.logger.error(
        { method, path, error: String(err) },
        "rest error",
      );
      throw err;
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, unknown>,
    queryArrayFormat: "repeat" | "comma" = "repeat",
  ): string {
    const url = new URL(`${this.options.endpoint}${this.options.basePath}${path}`);
    if (!query) {
      return url.toString();
    }

    for (const [key, value] of Object.entries(query)) {
      appendQueryValue(url.searchParams, key, value, queryArrayFormat);
    }
    return url.toString();
  }

  private async buildHeaders(
    options: RestRequestOptions,
    signal?: AbortSignal,
  ): Promise<Headers> {
    const headers = new Headers({
      Accept: options.accept ?? JSON_CONTENT_TYPE,
      "User-Agent": USER_AGENT,
    });

    if (options.body !== undefined) {
      headers.set("Content-Type", options.contentType ?? JSON_CONTENT_TYPE);
    }

    if (this.options.auth.method === "api_key") {
      headers.set("X-API-Key", this.options.auth.apiKey);
    } else if (this.getBearerToken) {
      headers.set("Authorization", `Bearer ${await this.getBearerToken(signal)}`);
    } else if (this.options.auth.method === "bearer") {
      headers.set("Authorization", bearerAuthHeader(this.options.auth.token));
    }

    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });

    return headers;
  }
}

export function encodePath(value: string): string {
  return encodeURIComponent(value);
}

function appendQueryValue(
  searchParams: URLSearchParams,
  key: string,
  value: unknown,
  arrayFormat: "repeat" | "comma" = "repeat",
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (Array.isArray(value)) {
    if (arrayFormat === "comma") {
      searchParams.append(key, value.map(String).join(","));
      return;
    }
    for (const item of value) {
      appendQueryValue(searchParams, key, item, arrayFormat);
    }
    return;
  }
  searchParams.append(key, String(value));
}

function responseWithCleanup(response: Response, cleanup: () => void): Response {
  if (!response.body) {
    cleanup();
    return response;
  }

  let cleaned = false;
  const cleanupOnce = () => {
    if (!cleaned) {
      cleaned = true;
      cleanup();
    }
  };

  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          cleanupOnce();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (err) {
        cleanupOnce();
        throw err;
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        cleanupOnce();
      }
    },
  });

  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function serializeRequestBody(
  body: unknown,
  contentType = JSON_CONTENT_TYPE,
): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }
  if (isJsonMediaType(contentType)) {
    return JSON.stringify(body);
  }
  if (
    typeof body === "string" ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof Blob !== "undefined" && body instanceof Blob)
  ) {
    return body as BodyInit;
  }
  return String(body);
}

async function parseResponseBody(
  response: Response,
  options: ParseResponseBodyOptions = {},
): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const text = await response.text();
  if (text === "") {
    return undefined;
  }
  if (isJsonMediaType(contentType)) {
    try {
      return JSON.parse(text) as unknown;
    } catch (err) {
      if (options.preserveInvalidJson) {
        return text;
      }
      throw err;
    }
  }
  return text;
}

function isJsonMediaType(contentType: string): boolean {
  const [rawMediaType = ""] = contentType.split(";", 1);
  const mediaType = rawMediaType.trim().toLowerCase();
  return mediaType === "application/json" || mediaType.endsWith("+json");
}

function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): RequestSignal {
  if (!timeoutMs || timeoutMs <= 0) {
    return { signal, cleanup: noop };
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!signal) {
    return { signal: timeoutSignal, cleanup: noop };
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted || timeoutSignal.aborted) {
    abort();
    return { signal: controller.signal, cleanup: noop };
  }
  signal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      signal.removeEventListener("abort", abort);
      timeoutSignal.removeEventListener("abort", abort);
    },
  };
}

function noop(): void {}
