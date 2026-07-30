import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/internal/logger.js";
import { type FetchLike, RestTransport } from "../../src/internal/rest.js";
import {
  type TransformersClient,
  type TransformersTransformer,
  createTransformersClient,
  transformersBasePath,
} from "../../src/transformers/index.js";

const logger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function createTransformers(fetch: FetchLike): TransformersClient {
  return createTransformersClient(
    new RestTransport({
      endpoint: "https://rdp.example.com",
      basePath: transformersBasePath(),
      auth: { method: "api_key", apiKey: "ak-123" },
      tokenFetcher: async () => ({ access_token: "unused" }),
      logger,
      fetch,
    }),
  );
}

interface RouteScenario {
  name: string;
  method: string;
  path: string;
  response: () => Promise<Response>;
  call: (client: TransformersClient) => Promise<unknown>;
}

describe("TransformersClient", () => {
  const jsonObject = async () => Response.json({ uid: "transformer" });
  const jsonArray = async () => Response.json([]);
  const noBody = async () => new Response(null, { status: 200 });
  const transformer = {
    uid: "xf",
    name: "Forwarder",
    description: "Forwards streaming data.",
    status: "available",
    security_markings: "UNCLASSIFIED",
    inputs: {},
    outputs: {},
    configuration: {},
    types: ["source"],
    instantiation: {},
  } as TransformersTransformer;

  it.each<RouteScenario>([
    {
      name: "workingCopies.list",
      method: "GET",
      path: "/api/v2/transformers/",
      response: jsonArray,
      call: (client) => client.workingCopies.list(),
    },
    {
      name: "workingCopies.create",
      method: "POST",
      path: "/api/v2/transformers/",
      response: jsonObject,
      call: (client) => client.workingCopies.create(transformer),
    },
    {
      name: "catalog.list",
      method: "GET",
      path: "/api/v2/transformers/catalog",
      response: jsonArray,
      call: (client) => client.catalog.list(),
    },
    {
      name: "types.list",
      method: "GET",
      path: "/api/v2/transformers/types",
      response: jsonArray,
      call: (client) => client.types.list(),
    },
    {
      name: "workingCopies.get",
      method: "GET",
      path: "/api/v2/transformers/xf%2Fid",
      response: jsonObject,
      call: (client) => client.workingCopies.get("xf/id"),
    },
    {
      name: "workingCopies.update",
      method: "PUT",
      path: "/api/v2/transformers/xf%2Fid",
      response: jsonObject,
      call: (client) => client.workingCopies.update("xf/id", transformer),
    },
    {
      name: "workingCopies.delete",
      method: "DELETE",
      path: "/api/v2/transformers/xf%2Fid",
      response: noBody,
      call: (client) => client.workingCopies.delete("xf/id"),
    },
    {
      name: "versions.list",
      method: "GET",
      path: "/api/v2/transformers/xf%2Fid/versions",
      response: jsonArray,
      call: (client) => client.versions.list("xf/id"),
    },
    {
      name: "versions.publish",
      method: "POST",
      path: "/api/v2/transformers/xf%2Fid/versions",
      response: jsonObject,
      call: (client) => client.versions.publish("xf/id", transformer),
    },
    {
      name: "versions.get",
      method: "GET",
      path: "/api/v2/transformers/xf%2Fid/versions/1.2.3",
      response: jsonObject,
      call: (client) => client.versions.get("xf/id", "1.2.3"),
    },
  ])(
    "routes $name to $method $path",
    async ({ method, path, response, call }) => {
      const fetch = vi.fn(response);
      const client = createTransformers(fetch);

      await call(client);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
      const actual = new URL(url);
      expect(`${actual.pathname}${actual.search}`).toBe(path);
      expect(init.method).toBe(method);
    },
  );

  it("uses the transformers base path, JSON headers, and API key auth", async () => {
    const fetch = vi.fn(async () => Response.json([]));
    const client = createTransformers(fetch);

    await client.catalog.list();

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://rdp.example.com/api/v2/transformers/catalog");
    const headers = new Headers(init.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("X-API-Key")).toBe("ak-123");
    expect(headers.get("User-Agent")).toMatch(/^rdp-sdk-typescript\//);
  });

  it("rejects empty path identifiers before dispatch", () => {
    const fetch = vi.fn(async () => Response.json({}));
    const client = createTransformers(fetch);

    expect(() => client.workingCopies.get("")).toThrow("rdp: uid is required");
    expect(() => client.versions.get("xf", "")).toThrow(
      "rdp: version is required",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws response details for non-2xx responses", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ message: "missing" }, { status: 404 }),
    );
    const client = createTransformers(fetch);

    await expect(client.workingCopies.get("missing")).rejects.toMatchObject({
      status: 404,
      body: { message: "missing" },
    });
  });
});
