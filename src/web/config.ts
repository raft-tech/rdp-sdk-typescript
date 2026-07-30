import { type RdpConfig, validateConfig } from "../internal/config.js";
import type { Logger } from "../internal/logger.js";
import { createLogger } from "../internal/web/logging.js";

/** Raw environment values for web configuration. */
export interface RdpEnv {
  RDP_SERVER_URL?: string;
  RDP_SERVER_PORT?: string;
  TLS_SKIP_VERIFY?: string;
  RDP_API_KEY?: string;
  RDP_CLIENT_ID?: string;
  RDP_CLIENT_SECRET?: string;
  RDP_BEARER_TOKEN?: string;
}

/**
 * Load SDK configuration from a plain config object.
 * Web equivalent of the Node.js loadConfig — accepts the same
 * RDP_ env var keys as properties.
 */
export function loadConfig(env: RdpEnv, logger?: Logger): RdpConfig {
  return validateConfig(
    {
      serverUrl: env.RDP_SERVER_URL,
      serverPort: env.RDP_SERVER_PORT,
      tlsSkipVerify: env.TLS_SKIP_VERIFY,
      apiKey: env.RDP_API_KEY,
      clientId: env.RDP_CLIENT_ID,
      clientSecret: env.RDP_CLIENT_SECRET,
      bearerToken: env.RDP_BEARER_TOKEN,
    },
    createLogger(logger),
  );
}
