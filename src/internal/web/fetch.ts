/** Fetch wrapper for browser Catalog REST calls that rejects redirects. */
export function webFetch(): typeof globalThis.fetch {
  return async (url, options = {}) =>
    globalThis.fetch(url, { ...options, redirect: "error" });
}
