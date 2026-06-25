import * as http from "node:http";
import * as https from "node:https";
import type { TokenFetcher } from "../auth.js";
import { type OauthCustomFetch, makeTokenFetcher } from "../oauth.js";

/**
 * Creates a TokenFetcher. When `tlsSkipVerify` is true, wires in a
 * customFetch that uses node:https with `rejectUnauthorized: false` so the
 * token endpoint can be reached against a self-signed cert. Otherwise
 * delegates entirely to oauth4webapi's default fetch (globalThis.fetch).
 */
export function nodeTokenFetcher(tlsSkipVerify: boolean): TokenFetcher {
  return makeTokenFetcher(tlsSkipVerify ? nodeSkipVerifyFetch() : undefined);
}

/**
 * node:https-based customFetch adapter that disables TLS verification.
 * Implements the oauth4webapi customFetch contract.
 */
function nodeSkipVerifyFetch(): OauthCustomFetch {
  return (url, options) =>
    new Promise<Response>((resolve, reject) => {
      const parsed = new URL(url);
      const reqModule = parsed.protocol === "https:" ? https : http;
      const req = reqModule.request(
        {
          method: options.method,
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          headers: options.headers,
          rejectUnauthorized: false,
          signal: options.signal,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const responseHeaders = new Headers();
            for (const [k, v] of Object.entries(res.headers)) {
              if (Array.isArray(v)) {
                for (const vv of v) responseHeaders.append(k, vv);
              } else if (v !== undefined) {
                responseHeaders.set(k, String(v));
              }
            }
            resolve(
              new Response(Buffer.concat(chunks), {
                status: res.statusCode ?? 0,
                headers: responseHeaders,
              }),
            );
          });
        },
      );
      req.on("error", reject);
      if (options.body !== undefined) {
        req.write(options.body.toString());
      }
      req.end();
    });
}
