import pino from "pino";
import type { Logger } from "../logger.js";

const ENV_LOG_LEVEL = "SDK_LOG_LEVEL";
const VALID_LEVELS = new Set(["debug", "info", "warn", "error"]);

/**
 * Create a pino logger using the SDK's precedence chain:
 *   1. Injected logger (highest precedence)
 *   2. SDK_LOG_LEVEL environment variable
 *   3. Silent (no-op) logger
 */
export function createLogger(injected?: Logger): Logger {
  if (injected) {
    return injected;
  }

  const envLevel = process.env[ENV_LOG_LEVEL]?.toLowerCase().trim();
  if (envLevel && VALID_LEVELS.has(envLevel)) {
    return pino({ level: envLevel }, pino.destination(2));
  }

  return pino({ level: "silent" });
}
