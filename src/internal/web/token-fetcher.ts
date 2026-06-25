import type { TokenFetcher } from "../auth.js";
import { makeTokenFetcher } from "../oauth.js";

/**
 * Creates a TokenFetcher for the web SDK. Delegates entirely to
 * oauth4webapi's default fetch (the browser's global fetch). Browsers
 * manage TLS verification themselves, so there is no skip-verify path.
 */
export function webTokenFetcher(): TokenFetcher {
  return makeTokenFetcher();
}
