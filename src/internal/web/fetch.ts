import type { FetchLike } from "../rest.js";

/** Fetch wrapper for browser Catalog REST calls that rejects redirects. */
export function webFetch(): FetchLike {
  return async (url, options = {}) =>
    globalThis.fetch(url, { ...options, redirect: "error" });
}
