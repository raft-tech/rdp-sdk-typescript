import { type ResolvedAuth, validateAuth } from "./auth.js";
import type { Logger } from "./logger.js";
import { type Option, WithAPIKey, WithClientCredentials } from "./options.js";

/** Validated SDK configuration. */
export interface RdpConfig {
  serverUrl: string;
  tlsSkipVerify: boolean;
  auth: ResolvedAuth;
}

/** Raw string values from environment variables or a config object. */
export interface RawConfig {
  serverUrl?: string;
  serverPort?: string;
  tlsSkipVerify?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
}

/** Default endpoint when none is provided. Mirrors Go's internal.DefaultEndpoint. */
export const DEFAULT_SERVER_URL = "https://rdp.local";

/** Normalize: trim, treat empty/whitespace as undefined. */
function normalize(val?: string): string | undefined {
  const trimmed = val?.trim();
  return trimmed || undefined;
}

/**
 * Validate a WDM endpoint URL.
 *
 * The OAuth2 auth endpoint is always at `{endpoint}/api/v1/auth/token`,
 * so any component on the endpoint that would distort that path is
 * rejected: path, query, fragment, and userinfo. Userinfo is rejected
 * in particular because browser `fetch` and node:https translate it
 * into an `Authorization: Basic` header that would bypass the SDK's
 * auth model.
 *
 * A trailing root slash (`https://host/`) is expected to have been
 * trimmed by the caller before validation.
 *
 * @throws Error with a specific reason if `raw` is not a valid endpoint.
 */
export function validateEndpointUrl(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `rdp: invalid endpoint ${JSON.stringify(raw)}: must be an absolute URL with scheme and host`,
    );
  }
  if (!parsed.protocol || !parsed.hostname) {
    throw new Error(
      `rdp: invalid endpoint ${JSON.stringify(raw)}: must be an absolute URL with scheme and host`,
    );
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error(
      `rdp: invalid endpoint ${JSON.stringify(raw)}: must not include userinfo`,
    );
  }
  if (parsed.pathname !== "" && parsed.pathname !== "/") {
    throw new Error(
      `rdp: invalid endpoint ${JSON.stringify(raw)}: must not include a path component`,
    );
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new Error(
      `rdp: invalid endpoint ${JSON.stringify(raw)}: must not include a query or fragment`,
    );
  }
}

/**
 * Validate raw config values and return a typed RdpConfig.
 * Throws on invalid combinations. Warns on missing auth or insecure mode.
 */
export function validateConfig(raw: RawConfig, logger: Logger): RdpConfig {
  // Server URL
  let serverUrl = (normalize(raw.serverUrl) ?? DEFAULT_SERVER_URL).replace(
    /\/+$/,
    "",
  );
  try {
    validateEndpointUrl(serverUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`rdp: invalid RDP_SERVER_URL: ${msg}`);
  }

  // Port override
  const portStr = normalize(raw.serverPort);
  if (portStr) {
    const port = Number(portStr);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error(`rdp: invalid RDP_SERVER_PORT: ${portStr}`);
    }
    const url = new URL(serverUrl);
    url.port = String(port);
    serverUrl = url.toString().replace(/\/$/, "");
  }

  // TLS
  const tlsSkipVerify = normalize(raw.tlsSkipVerify) === "true";

  // Normalize and check for partial client credentials
  const clientId = normalize(raw.clientId);
  const clientSecret = normalize(raw.clientSecret);
  const hasPartialCredentials =
    (clientId && !clientSecret) || (!clientId && clientSecret);

  if (hasPartialCredentials) {
    logger.warn("rdp: incomplete client credentials, ignoring");
  }

  // Build credentials object only when both parts are present
  const clientCredentials =
    clientId && clientSecret ? { clientId, clientSecret } : undefined;

  // Delegate auth validation + resolution to the single source of truth
  const auth = validateAuth(
    {
      clientCredentials,
      apiKey: normalize(raw.apiKey),
    },
    logger,
  );

  return { serverUrl, tlsSkipVerify, auth };
}

/**
 * Convert a validated RdpConfig into arguments for createClient.
 *
 * Returns [endpoint, ...options] — spread directly into createClient:
 * ```ts
 * const client = createClient(...fromConfig(cfg));
 * ```
 *
 * Note: tlsSkipVerify is node-only. Use fromNodeConfig() to include it.
 */
export function fromConfig(cfg: RdpConfig): [string, ...Option[]] {
  const opts: Option[] = [];

  if (cfg.auth.method === "client_credentials") {
    opts.push(WithClientCredentials(cfg.auth.clientId, cfg.auth.clientSecret));
  } else if (cfg.auth.method === "api_key") {
    opts.push(WithAPIKey(cfg.auth.apiKey));
  }

  return [cfg.serverUrl, ...opts];
}
