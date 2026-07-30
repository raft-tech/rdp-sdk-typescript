import type { Interceptor } from "@connectrpc/connect";
import {
  type ResolvedAuth,
  type TokenFetcher,
  apiKeyInterceptor,
  authorizationInterceptor,
  bearerAuthHeader,
  clientCredentialsInterceptor,
  userAgentInterceptor,
  validateAuth,
} from "./auth.js";
import { DEFAULT_SERVER_URL, validateEndpointUrl } from "./config.js";
import { loggingInterceptor, timeoutInterceptor } from "./interceptors.js";
import type { Logger } from "./logger.js";
import type { Options } from "./options.js";

/**
 * Parse the variadic createClient arguments into a rawEndpoint (or undefined)
 * and the remaining option mutators. Throws if the endpoint was passed as the
 * empty string, which would otherwise be silently coerced to the default.
 */
export function resolveArgs<Opt>(args: [string, ...Opt[]] | Opt[]): {
  rawEndpoint: string | undefined;
  opts: Opt[];
} {
  if (typeof args[0] === "string") {
    const rawEndpoint = args[0];
    if (rawEndpoint === "") {
      throw new Error("rdp: endpoint is required");
    }
    return { rawEndpoint, opts: args.slice(1) as Opt[] };
  }
  return { rawEndpoint: undefined, opts: args as Opt[] };
}

/**
 * Resolve the final endpoint URL. Strips trailing slashes, falls back to
 * [DEFAULT_SERVER_URL] when no endpoint was provided, and rejects any URL
 * with a path, query, fragment, or userinfo component (the auth endpoint
 * is always at {endpoint}/api/v1/auth/token).
 */
export function resolveEndpoint(rawEndpoint: string | undefined): string {
  const endpoint = rawEndpoint
    ? rawEndpoint.replace(/\/+$/, "")
    : DEFAULT_SERVER_URL;
  validateEndpointUrl(endpoint);
  return endpoint;
}

/** Resolve client auth from the shared SDK options. */
export function resolveAuth(o: Options, logger: Logger): ResolvedAuth {
  return validateAuth(
    {
      clientCredentials: o.clientCredentials,
      apiKey: o.apiKey,
      bearerToken: o.bearerToken,
    },
    logger,
  );
}

/**
 * Build the interceptor chain shared by every facade on both the node and
 * web SDKs: userAgent -> auth -> logging -> timeout. Callers own the
 * platform-specific createConnectTransport call
 * because its options differ materially (HTTP/2 + nodeOptions on node,
 * plain fetch-based on web).
 */
export function buildInterceptors(
  endpoint: string,
  o: Options,
  tokenFetcher: TokenFetcher,
  logger: Logger,
  auth: ResolvedAuth = resolveAuth(o, logger),
): Interceptor[] {
  const interceptors: Interceptor[] = [userAgentInterceptor()];

  if (auth.method === "client_credentials") {
    const tokenUrl = `${endpoint}/api/v1/auth/token`;
    interceptors.push(
      clientCredentialsInterceptor(
        auth.clientId,
        auth.clientSecret,
        tokenUrl,
        tokenFetcher,
        logger,
      ),
    );
  } else if (auth.method === "api_key") {
    interceptors.push(apiKeyInterceptor(auth.apiKey));
  } else if (auth.method === "bearer") {
    interceptors.push(authorizationInterceptor(bearerAuthHeader(auth.token)));
  }

  interceptors.push(loggingInterceptor(logger), timeoutInterceptor(o.timeout));
  return interceptors;
}
