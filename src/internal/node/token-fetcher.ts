import type { TokenFetcher } from "../auth.js";
import { type OauthCustomFetch, makeTokenFetcher } from "../oauth.js";
import { nodeSkipVerifyFetch } from "./fetch.js";

/**
 * Creates a TokenFetcher. When `tlsSkipVerify` is true, wires in a
 * customFetch that uses node:https with `rejectUnauthorized: false` so the
 * token endpoint can be reached against a self-signed cert. Otherwise
 * delegates entirely to oauth4webapi's default fetch (globalThis.fetch).
 */
export function nodeTokenFetcher(tlsSkipVerify: boolean): TokenFetcher {
  return makeTokenFetcher(
    tlsSkipVerify ? (nodeSkipVerifyFetch() as OauthCustomFetch) : undefined,
  );
}
