import type { Options } from "../options.js";

// Re-export all core options.
export {
  type Option,
  type Options as CoreOptions,
  WithAPIKey,
  WithClientCredentials,
  WithLogger,
  WithTimeout,
  defaultOptions as coreDefaultOptions,
} from "../options.js";

/** Node.js-specific options extending core options. */
export interface NodeOptions extends Options {
  tlsSkipVerify: boolean;
}

/** Node.js-specific functional option. */
export type NodeOption = (opts: NodeOptions) => void;

/** Returns the base Node.js configuration. */
export function defaultOptions(): NodeOptions {
  return { tlsSkipVerify: false };
}

/** Disables TLS certificate verification (dev environments only). */
export function WithTLSSkipVerify(): NodeOption {
  return (o) => {
    o.tlsSkipVerify = true;
  };
}
