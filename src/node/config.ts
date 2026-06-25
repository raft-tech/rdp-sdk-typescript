import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { config } from "dotenv";
import {
  type RdpConfig,
  fromConfig,
  validateConfig,
} from "../internal/config.js";
import type { Logger } from "../internal/logger.js";
import { createLogger } from "../internal/node/logging.js";
import {
  type NodeOption,
  WithTLSSkipVerify,
} from "../internal/node/options.js";

/**
 * Search upward from startDir for a file named `filename`.
 * Returns the resolved path if found, undefined otherwise.
 */
function findUp(filename: string, startDir: string): string | undefined {
  let dir = resolve(startDir);
  while (true) {
    const candidate = join(dir, filename);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Load SDK configuration from environment variables and an optional
 * `.env.local` file (or custom path). Searches upward from CWD for
 * `.env.local` if no explicit path is given. Environment variables
 * take precedence over values in the file.
 *
 * The env-var contract is shared across facades; this per-facade helper
 * exists so that callers can `import { loadConfig } from
 * "rdp-sdk-typescript/wdm"` and stay inside the canonical facade.
 */
export function loadConfig(opts?: {
  envPath?: string;
  logger?: Logger;
}): RdpConfig {
  const envPath = opts?.envPath ?? findUp(".env.local", process.cwd());
  if (envPath) {
    config({ path: envPath });
  }

  const logger = createLogger(opts?.logger);

  return validateConfig(
    {
      serverUrl: process.env.RDP_SERVER_URL,
      serverPort: process.env.RDP_SERVER_PORT,
      tlsSkipVerify: process.env.TLS_SKIP_VERIFY,
      apiKey: process.env.RDP_API_KEY,
      clientId: process.env.RDP_CLIENT_ID,
      clientSecret: process.env.RDP_CLIENT_SECRET,
    },
    logger,
  );
}

/**
 * Convert a validated RdpConfig into arguments for the Node.js createClient.
 * Includes WithTLSSkipVerify when cfg.tlsSkipVerify is true.
 *
 * ```ts
 * const client = createClient(...fromNodeConfig(cfg));
 * ```
 */
export function fromNodeConfig(cfg: RdpConfig): [string, ...NodeOption[]] {
  const [endpoint, ...opts] = fromConfig(cfg);
  const nodeOpts: NodeOption[] = [...opts];
  if (cfg.tlsSkipVerify) {
    nodeOpts.push(WithTLSSkipVerify());
  }
  return [endpoint, ...nodeOpts];
}
