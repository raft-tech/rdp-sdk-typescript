import type { Interceptor } from "@connectrpc/connect";
import type { Logger } from "./logger.js";

/**
 * ConnectRPC interceptor that logs request/response lifecycle events.
 * Requests and responses are logged at DEBUG, errors at ERROR. When the
 * logger is silent (default), this is effectively free.
 */
export function loggingInterceptor(logger: Logger): Interceptor {
  return (next) => async (req) => {
    const procedure = `${req.service.typeName}/${req.method.name}`;
    logger.debug({ procedure }, "rpc request");
    try {
      const res = await next(req);
      logger.debug({ procedure }, "rpc response");
      return res;
    } catch (err) {
      logger.error({ procedure, error: String(err) }, "rpc error");
      throw err;
    }
  };
}

/**
 * ConnectRPC interceptor that applies an opt-in ceiling to unary RPC calls.
 * Streaming RPCs are not affected — they are long-lived by design. When
 * timeoutMs is unset or non-positive, the interceptor is a pass-through and
 * any caller-supplied AbortSignal on the request wins.
 *
 * Uses AbortSignal.timeout() to race the RPC against the deadline.
 */
export function timeoutInterceptor(timeoutMs?: number): Interceptor {
  return (next) => async (req) => {
    // No SDK-level deadline if stream, unset, or non-positive.
    if (req.stream || !timeoutMs || timeoutMs <= 0) {
      return next(req);
    }

    // Race the RPC against a timeout signal.
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        reject(
          new DOMException(
            `rdp: unary RPC timed out after ${timeoutMs}ms`,
            "TimeoutError",
          ),
        );
      };
      if (timeoutSignal.aborted) {
        onAbort();
        return;
      }
      timeoutSignal.addEventListener("abort", onAbort, { once: true });
      next(req).then(
        (res) => {
          timeoutSignal.removeEventListener("abort", onAbort);
          resolve(res);
        },
        (err) => {
          timeoutSignal.removeEventListener("abort", onAbort);
          reject(err);
        },
      );
    });
  };
}
