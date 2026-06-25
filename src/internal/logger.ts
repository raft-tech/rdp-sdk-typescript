/**
 * Platform-agnostic logger interface for the RDP SDK.
 * Compatible with pino (Node.js) and console-based loggers (Web).
 * Each level supports both (msg) and (obj, msg) signatures for pino interop.
 */
export interface Logger {
  debug(msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
  info(msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  warn(msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}
