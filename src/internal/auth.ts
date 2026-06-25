import type { Interceptor } from "@connectrpc/connect";
import type { Logger } from "./logger.js";
import { VERSION } from "./version.js";

const USER_AGENT = `rdp-sdk-typescript/${VERSION}`;

/**
 * Bounds the OAuth2 token endpoint round-trip. Platform fetchers pass
 * this as an AbortSignal on their underlying request so a hung auth
 * server cannot deadlock RPC calls indefinitely.
 */
export const TOKEN_FETCH_TIMEOUT_MS = 10_000;

// Fallback TTL applied when the server response omits expires_in.
const TOKEN_DEFAULT_EXPIRES_SECONDS = 300;
// Refresh slightly before the server-reported expiry so a token that is
// about to expire mid-flight is replaced before it is used.
const TOKEN_EARLY_REFRESH_DELTA_SECONDS = 10;
const MILLIS_PER_SECOND = 1_000;

/** Response shape from the token endpoint. */
export interface TokenResponse {
  access_token: string;
  /** Server-reported token lifetime in seconds (OAuth2 standard). */
  expires_in?: number;
}

/**
 * Abstract function that posts client credentials to the token endpoint.
 * Platform layers (node/web) provide a concrete implementation.
 */
export type TokenFetcher = (
  url: string,
  body: URLSearchParams,
) => Promise<TokenResponse>;

/** Resolved auth method after validation. */
export type ResolvedAuth =
  | { method: "client_credentials"; clientId: string; clientSecret: string }
  | { method: "api_key"; apiKey: string }
  | { method: "none" };

/**
 * Validate auth configuration at client creation time.
 *
 * TLS verification is orthogonal to auth resolution: credentials flow
 * through regardless of insecure mode. The TLS-skip warning is emitted
 * separately at client construction.
 *
 * Throws if both clientCredentials and apiKey are set, warns if neither
 * is set. Returns the resolved auth method so callers can use it for
 * interceptor wiring or config building.
 */
export function validateAuth(
  opts: {
    clientCredentials?: { clientId: string; clientSecret: string };
    apiKey?: string;
  },
  logger: Logger,
): ResolvedAuth {
  const hasCredentials = opts.clientCredentials != null;
  const apiKey = opts.apiKey?.trim() || undefined;

  if (opts.apiKey != null && apiKey === undefined) {
    logger.warn("rdp: api_key is empty, ignoring");
  }

  if (hasCredentials && apiKey) {
    throw new Error(
      "rdp: both clientCredentials and apiKey are set — provide exactly one auth method",
    );
  }

  if (opts.clientCredentials) {
    return {
      method: "client_credentials",
      clientId: opts.clientCredentials.clientId,
      clientSecret: opts.clientCredentials.clientSecret,
    };
  }

  if (apiKey) {
    return { method: "api_key", apiKey };
  }

  logger.warn("rdp: no auth configured");
  return { method: "none" };
}

/**
 * ConnectRPC interceptor that fetches an OAuth2 token using client credentials
 * and injects it as a Bearer token on every request.
 *
 * Cache TTL follows the server-returned `expires_in` field, minus a
 * 10-second early-refresh delta so a token that is about to expire
 * mid-flight is replaced before it is used. Falls back to 300 seconds
 * when the server omits `expires_in` or returns a non-positive value.
 */
export function clientCredentialsInterceptor(
  clientId: string,
  clientSecret: string,
  tokenUrl: string,
  fetchToken: TokenFetcher,
  logger: Logger,
): Interceptor {
  let cachedToken: string | undefined;
  let expiresAt = 0;
  let inflight: Promise<string> | undefined;

  async function acquireToken(): Promise<string> {
    logger.debug("rdp: fetching new oauth2 token");
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    const response = await fetchToken(tokenUrl, body);
    cachedToken = response.access_token;
    const serverExpires =
      typeof response.expires_in === "number" && response.expires_in > 0
        ? response.expires_in
        : TOKEN_DEFAULT_EXPIRES_SECONDS;
    const effectiveTtlSeconds = Math.max(
      0,
      serverExpires - TOKEN_EARLY_REFRESH_DELTA_SECONDS,
    );
    expiresAt = Date.now() + effectiveTtlSeconds * MILLIS_PER_SECOND;
    logger.info("rdp: oauth2 token acquired");
    return cachedToken;
  }

  return (next) => async (req) => {
    if (!cachedToken || Date.now() >= expiresAt) {
      if (!inflight) {
        inflight = acquireToken().finally(() => {
          inflight = undefined;
        });
      }
      await inflight;
    }
    req.header.set("Authorization", `Bearer ${cachedToken}`);
    return next(req);
  };
}

/**
 * ConnectRPC interceptor that sets X-API-Key on every request.
 */
export function apiKeyInterceptor(apiKey: string): Interceptor {
  return (next) => async (req) => {
    req.header.set("X-API-Key", apiKey);
    return next(req);
  };
}

/**
 * ConnectRPC interceptor that sets User-Agent on every request.
 */
export function userAgentInterceptor(): Interceptor {
  return (next) => async (req) => {
    req.header.set("User-Agent", USER_AGENT);
    return next(req);
  };
}
