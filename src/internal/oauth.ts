import * as oauth from "oauth4webapi";
import {
  TOKEN_FETCH_TIMEOUT_MS,
  type TokenFetcher,
  type TokenResponse,
} from "./auth.js";

/**
 * oauth4webapi's customFetch hook shape. Extracted so platform adapters
 * (e.g. a node:https-based TLS-skip adapter) implement exactly this
 * contract.
 */
export type OauthCustomFetch = (
  url: string,
  options: oauth.CustomFetchOptions<"POST", URLSearchParams>,
) => Promise<Response>;

/**
 * Build a TokenFetcher that delegates token-endpoint handling to
 * oauth4webapi. Spec-correct RFC 6749 response parsing (including error
 * responses and token_type validation) lives in the library so the SDK
 * doesn't have to.
 *
 * Pass `customFetch` to use a platform-specific fetch implementation —
 * the Node adapter does this to honor TLS skip-verify. When omitted,
 * oauth4webapi uses globalThis.fetch.
 *
 * `allowInsecureRequests` is always enabled: the SDK accepts http://
 * endpoints (for local dev) at the endpoint-validation layer, so the
 * token request path must too.
 */
export function makeTokenFetcher(customFetch?: OauthCustomFetch): TokenFetcher {
  return async (url, body, signal): Promise<TokenResponse> => {
    const tokenUrl = new URL(url);
    const as: oauth.AuthorizationServer = {
      issuer: tokenUrl.origin,
      token_endpoint: url,
    };
    const clientId = body.get("client_id") ?? "";
    const clientSecret = body.get("client_secret") ?? "";
    const client: oauth.Client = { client_id: clientId };
    const clientAuth = oauth.ClientSecretPost(clientSecret);
    const requestSignal = combineSignals(
      signal,
      AbortSignal.timeout(TOKEN_FETCH_TIMEOUT_MS),
    );

    try {
      const response = await oauth.clientCredentialsGrantRequest(
        as,
        client,
        clientAuth,
        new URLSearchParams(),
        {
          signal: requestSignal.signal,
          // oauth4webapi marks this symbol @deprecated purely to make it
          // visually stand out; it's the supported way to accept http:// for
          // local development.
          [oauth.allowInsecureRequests]: true,
          ...(customFetch ? { [oauth.customFetch]: customFetch } : {}),
        },
      );
      const tokenResponse = await oauth.processClientCredentialsResponse(
        as,
        client,
        response,
      );
      return {
        access_token: tokenResponse.access_token,
        expires_in: tokenResponse.expires_in,
      };
    } finally {
      requestSignal.cleanup();
    }
  };
}

interface CombinedSignal {
  signal: AbortSignal;
  cleanup: () => void;
}

function combineSignals(
  callerSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
): CombinedSignal {
  if (!callerSignal) {
    return { signal: timeoutSignal, cleanup: noop };
  }
  if (callerSignal.aborted) {
    return { signal: callerSignal, cleanup: noop };
  }
  if (timeoutSignal.aborted) {
    return { signal: timeoutSignal, cleanup: noop };
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  callerSignal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      callerSignal.removeEventListener("abort", abort);
      timeoutSignal.removeEventListener("abort", abort);
    },
  };
}

function noop(): void {}
