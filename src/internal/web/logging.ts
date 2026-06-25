import type { Logger } from "../logger.js";

const noop: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

/**
 * Create a logger for the web SDK.
 * Returns the injected logger if provided, otherwise a silent noop logger.
 * No SDK_LOG_LEVEL env var support (no process.env in browsers).
 */
export function createLogger(injected?: Logger): Logger {
  return injected ?? noop;
}
