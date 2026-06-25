import type { Logger } from "./logger.js";

/** Configuration for the SDK client. */
export interface Options {
  /**
   * Opt-in ceiling (ms) on unary RPC calls. When unset, no SDK-level
   * deadline is applied and callers own their deadlines via per-call
   * AbortSignal. Streaming RPCs are never affected.
   */
  timeout?: number;
  /** OAuth2 client credentials for token-based auth. */
  clientCredentials?: { clientId: string; clientSecret: string };
  apiKey?: string;
  logger?: Logger;
}

/** Functional option that configures the SDK client. */
export type Option = (opts: Options) => void;

/** Returns the base configuration with default server settings. */
export function defaultOptions(): Options {
  return {};
}

/** Configures OAuth2 client credentials authentication. */
export function WithClientCredentials(
  clientId: string,
  clientSecret: string,
): Option {
  return (o) => {
    o.clientCredentials = { clientId, clientSecret };
  };
}

/** Configures API key authentication. */
export function WithAPIKey(key: string): Option {
  return (o) => {
    o.apiKey = key;
  };
}

/**
 * Sets an opt-in ceiling on unary RPC calls. Streaming RPCs are not
 * affected. When omitted, no SDK-level deadline is applied.
 */
export function WithTimeout(ms: number): Option {
  return (o) => {
    o.timeout = ms;
  };
}

/** Injects a structured logger. Takes precedence over SDK_LOG_LEVEL. */
export function WithLogger(logger: Logger): Option {
  return (o) => {
    o.logger = logger;
  };
}
