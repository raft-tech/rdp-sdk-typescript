import { describe, expect, it, vi } from "vitest";
import {
  catalogBasePath,
  createCatalogClient,
} from "../../src/catalog/index.js";
import type {
  AccessControls,
  AddDocumentRequest,
  CatalogClient,
  CreateFilteredDatasetRequest,
  DataSet,
  DataSetPatch,
  DataSetStorage,
  DataSource,
  DataSourceEnablement,
  DataSourceEnablementRequest,
  DataSourcePatch,
  DatasetMetadata,
  GlobalSearchRequest,
  Ingestion,
  JsonPatchOperation,
  SchemaHints,
} from "../../src/catalog/index.js";
import type { Logger } from "../../src/internal/logger.js";
import { type FetchLike, RestTransport } from "../../src/internal/rest.js";

const logger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function createCatalog(fetch: FetchLike): CatalogClient {
  return createCatalogClient(
    new RestTransport({
      endpoint: "https://rdp.example.com",
      basePath: catalogBasePath(),
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
  contentType?: string;
  call: (client: CatalogClient) => Promise<unknown>;
}

describe("CatalogClient", () => {
  const jsonObject = async () => Response.json({});
  const jsonArray = async () => Response.json([]);
  const noContent = async () => new Response(null, { status: 204 });
  const count = async () =>
    new Response(null, { status: 200, headers: { Count: "3" } });

  const dataSource = { name: "Source", dynamicDiscovery: true };
  const dataset = {
    name: "Tracks",
    deletable: true,
    ingestable: true,
    autoDocumentEnabled: false,
  };
  const document = { name: "doc", contentType: "text/plain" };
  const enablement = { name: "enabled", dataSourceId: "ds" };
  const ingestion = { state: "started" };
  const storage = { datasetId: "data", name: "storage" };

  it.each([
    [
      "dataSources.create",
      (client: CatalogClient) => client.dataSources.create(dataSource),
      "POST",
      "/api/v2/catalog/datasources",
      jsonObject,
    ],
    [
      "dataSources.get",
      (client: CatalogClient) => client.dataSources.get("ds"),
      "GET",
      "/api/v2/catalog/datasources/ds",
      jsonObject,
    ],
    [
      "dataSources.update",
      (client: CatalogClient) => client.dataSources.update("ds", dataSource),
      "PUT",
      "/api/v2/catalog/datasources/ds",
      jsonObject,
    ],
    [
      "dataSources.patch",
      (client: CatalogClient) => client.dataSources.patch("ds", dataSource),
      "PATCH",
      "/api/v2/catalog/datasources/ds",
      noContent,
    ],
    [
      "dataSources.delete",
      (client: CatalogClient) => client.dataSources.delete("ds"),
      "DELETE",
      "/api/v2/catalog/datasources/ds",
      jsonObject,
    ],
    [
      "dataSources.addLabels",
      (client: CatalogClient) => client.dataSources.addLabels("ds", ["a"]),
      "POST",
      "/api/v2/catalog/datasources/ds/labels",
      noContent,
    ],
    [
      "dataSources.labels",
      (client: CatalogClient) => client.dataSources.labels("ds"),
      "GET",
      "/api/v2/catalog/datasources/ds/labels",
      jsonArray,
    ],
    [
      "dataSources.countLabels",
      (client: CatalogClient) => client.dataSources.countLabels("ds"),
      "HEAD",
      "/api/v2/catalog/datasources/ds/labels",
      count,
    ],
    [
      "dataSources.updateLabels",
      (client: CatalogClient) => client.dataSources.updateLabels("ds", ["a"]),
      "PUT",
      "/api/v2/catalog/datasources/ds/labels",
      noContent,
    ],
    [
      "dataSources.deleteLabels",
      (client: CatalogClient) => client.dataSources.deleteLabels("ds", ["a"]),
      "DELETE",
      "/api/v2/catalog/datasources/ds/labels",
      noContent,
    ],
    [
      "dataSources.addDocument",
      (client: CatalogClient) => client.dataSources.addDocument("ds", document),
      "POST",
      "/api/v2/catalog/datasources/ds/documents",
      jsonObject,
    ],
    [
      "dataSources.documents",
      (client: CatalogClient) => client.dataSources.documents("ds"),
      "GET",
      "/api/v2/catalog/datasources/ds/documents",
      jsonArray,
    ],
    [
      "dataSources.document",
      (client: CatalogClient) => client.dataSources.document("ds", "doc"),
      "GET",
      "/api/v2/catalog/datasources/ds/documents/doc",
      jsonObject,
    ],
    [
      "dataSources.deleteDocument",
      (client: CatalogClient) => client.dataSources.deleteDocument("ds", "doc"),
      "DELETE",
      "/api/v2/catalog/datasources/ds/documents/doc",
      noContent,
    ],
    [
      "dataSources.allEnablements",
      (client: CatalogClient) =>
        client.dataSources.allEnablements({ group: "g" }),
      "GET",
      "/api/v2/catalog/datasources/all/enablements?group=g",
      jsonArray,
    ],
    [
      "dataSources.countAllEnablements",
      (client: CatalogClient) => client.dataSources.countAllEnablements(),
      "HEAD",
      "/api/v2/catalog/datasources/all/enablements",
      count,
    ],
    [
      "dataSources.datasets",
      (client: CatalogClient) =>
        client.dataSources.datasets("ds", { name: "n" }),
      "GET",
      "/api/v2/catalog/datasources/ds/enablements/all/datasets?name=n",
      jsonArray,
    ],
    [
      "dataSources.countDatasets",
      (client: CatalogClient) => client.dataSources.countDatasets("ds"),
      "HEAD",
      "/api/v2/catalog/datasources/ds/enablements/all/datasets",
      count,
    ],
    [
      "dataSources.allDatasets",
      (client: CatalogClient) =>
        client.dataSources.allDatasets({ labels: ["x"] }),
      "GET",
      "/api/v2/catalog/datasources/all/enablements/all/datasets?labels=x",
      jsonArray,
    ],
    [
      "dataSources.countAllDatasets",
      (client: CatalogClient) => client.dataSources.countAllDatasets(),
      "HEAD",
      "/api/v2/catalog/datasources/all/enablements/all/datasets",
      count,
    ],
    [
      "enablements.list",
      (client: CatalogClient) =>
        client.enablements.list({ dataSourceId: "ds" }),
      "GET",
      "/api/v2/catalog/enablements?dataSourceId=ds",
      jsonArray,
    ],
    [
      "enablements.count",
      (client: CatalogClient) => client.enablements.count(),
      "HEAD",
      "/api/v2/catalog/enablements",
      count,
    ],
    [
      "enablements.create",
      (client: CatalogClient) => client.enablements.create(enablement),
      "POST",
      "/api/v2/catalog/enablements",
      noContent,
    ],
    [
      "enablements.deleteAll",
      (client: CatalogClient) =>
        client.enablements.deleteAll({ dataSourceId: "ds" }),
      "DELETE",
      "/api/v2/catalog/enablements?dataSourceId=ds",
      noContent,
    ],
    [
      "enablements.get",
      (client: CatalogClient) => client.enablements.get("en"),
      "GET",
      "/api/v2/catalog/enablements/en",
      jsonObject,
    ],
    [
      "enablements.update",
      (client: CatalogClient) => client.enablements.update("en", enablement),
      "PUT",
      "/api/v2/catalog/enablements/en",
      jsonObject,
    ],
    [
      "enablements.patch",
      (client: CatalogClient) => client.enablements.patch("en", enablement),
      "PATCH",
      "/api/v2/catalog/enablements/en",
      noContent,
    ],
    [
      "enablements.delete",
      (client: CatalogClient) => client.enablements.delete("en"),
      "DELETE",
      "/api/v2/catalog/enablements/en",
      jsonObject,
    ],
    [
      "datasets.list",
      (client: CatalogClient) => client.datasets.list({ enablementId: "en" }),
      "GET",
      "/api/v2/catalog/datasets?enablementId=en",
      jsonArray,
    ],
    [
      "datasets.create",
      (client: CatalogClient) => client.datasets.create(dataset),
      "POST",
      "/api/v2/catalog/datasets",
      noContent,
    ],
    [
      "datasets.deleteAll",
      (client: CatalogClient) =>
        client.datasets.deleteAll({ enablementId: "en" }),
      "DELETE",
      "/api/v2/catalog/datasets?enablementId=en",
      noContent,
    ],
    [
      "datasets.update",
      (client: CatalogClient) => client.datasets.update("data", dataset),
      "PUT",
      "/api/v2/catalog/datasets/data",
      noContent,
    ],
    [
      "datasets.patch",
      (client: CatalogClient) => client.datasets.patch("data", dataset),
      "PATCH",
      "/api/v2/catalog/datasets/data",
      noContent,
    ],
    [
      "datasets.delete",
      (client: CatalogClient) => client.datasets.delete("data"),
      "DELETE",
      "/api/v2/catalog/datasets/data",
      noContent,
    ],
    [
      "datasets.addLabels",
      (client: CatalogClient) => client.datasets.addLabels("data", ["a"]),
      "POST",
      "/api/v2/catalog/datasets/data/labels",
      noContent,
    ],
    [
      "datasets.labels",
      (client: CatalogClient) => client.datasets.labels("data"),
      "GET",
      "/api/v2/catalog/datasets/data/labels",
      jsonArray,
    ],
    [
      "datasets.countLabels",
      (client: CatalogClient) => client.datasets.countLabels("data"),
      "HEAD",
      "/api/v2/catalog/datasets/data/labels",
      count,
    ],
    [
      "datasets.updateLabels",
      (client: CatalogClient) => client.datasets.updateLabels("data", ["a"]),
      "PUT",
      "/api/v2/catalog/datasets/data/labels",
      noContent,
    ],
    [
      "datasets.deleteLabels",
      (client: CatalogClient) => client.datasets.deleteLabels("data", ["a"]),
      "DELETE",
      "/api/v2/catalog/datasets/data/labels",
      noContent,
    ],
    [
      "datasets.startIngestion",
      (client: CatalogClient) =>
        client.datasets.startIngestion("data", ingestion),
      "POST",
      "/api/v2/catalog/datasets/data/ingestion",
      noContent,
    ],
    [
      "datasets.stopIngestion",
      (client: CatalogClient) => client.datasets.stopIngestion("data"),
      "DELETE",
      "/api/v2/catalog/datasets/data/ingestion",
      noContent,
    ],
    [
      "datasets.ingestionStatus",
      (client: CatalogClient) => client.datasets.ingestionStatus("data"),
      "GET",
      "/api/v2/catalog/datasets/data/ingestion",
      jsonObject,
    ],
    [
      "datasets.patchIngestion",
      (client: CatalogClient) =>
        client.datasets.patchIngestion("data", ingestion),
      "PATCH",
      "/api/v2/catalog/datasets/data/ingestion",
      noContent,
    ],
    [
      "datasets.schema",
      (client: CatalogClient) => client.datasets.schema("data", { raw: true }),
      "GET",
      "/api/v2/catalog/datasets/data/schema?raw=true",
      async () =>
        new Response("message Example {}", {
          headers: { "Content-Type": "application/x-protobuf-schema" },
        }),
    ],
    [
      "datasets.updateSchema",
      (client: CatalogClient) => client.datasets.updateSchema("data", {}),
      "PUT",
      "/api/v2/catalog/datasets/data/schema",
      jsonObject,
    ],
    [
      "datasets.schemaHints",
      (client: CatalogClient) => client.datasets.schemaHints("data"),
      "GET",
      "/api/v2/catalog/datasets/data/schema/hints",
      jsonObject,
    ],
    [
      "datasets.updateSchemaHints",
      (client: CatalogClient) => client.datasets.updateSchemaHints("data", {}),
      "PUT",
      "/api/v2/catalog/datasets/data/schema/hints",
      jsonObject,
    ],
    [
      "datasets.deleteSchemaHints",
      (client: CatalogClient) => client.datasets.deleteSchemaHints("data"),
      "DELETE",
      "/api/v2/catalog/datasets/data/schema/hints",
      noContent,
    ],
    [
      "datasets.accessControls",
      (client: CatalogClient) => client.datasets.accessControls("data"),
      "GET",
      "/api/v2/catalog/datasets/data/access-controls",
      jsonObject,
    ],
    [
      "datasets.replaceAccessControls",
      (client: CatalogClient) =>
        client.datasets.replaceAccessControls("data", {}),
      "PUT",
      "/api/v2/catalog/datasets/data/access-controls",
      jsonObject,
    ],
    [
      "datasets.patchAccessControls",
      (client: CatalogClient) =>
        client.datasets.patchAccessControls("data", [
          { op: "add", path: "/filters" },
        ]),
      "PATCH",
      "/api/v2/catalog/datasets/data/access-controls",
      jsonObject,
    ],
    [
      "datasets.deleteAccessControls",
      (client: CatalogClient) => client.datasets.deleteAccessControls("data"),
      "DELETE",
      "/api/v2/catalog/datasets/data/access-controls",
      noContent,
    ],
    [
      "datasets.deleteAccessControl",
      (client: CatalogClient) =>
        client.datasets.deleteAccessControl("data", "ac"),
      "DELETE",
      "/api/v2/catalog/datasets/data/access-controls/ac",
      noContent,
    ],
    [
      "datasets.derived",
      (client: CatalogClient) => client.datasets.derived("data"),
      "GET",
      "/api/v2/catalog/datasets/data/filters",
      jsonArray,
    ],
    [
      "datasets.createFilter",
      (client: CatalogClient) =>
        client.datasets.createFilter(
          "data",
          { name: "filtered" },
          { dryRun: true },
        ),
      "POST",
      "/api/v2/catalog/datasets/data/filters?dryRun=true",
      jsonObject,
    ],
    [
      "datasets.pipelines",
      (client: CatalogClient) => client.datasets.pipelines("data"),
      "GET",
      "/api/v2/catalog/datasets/data/pipelines",
      jsonArray,
    ],
    [
      "datasets.metadata",
      (client: CatalogClient) => client.datasets.metadata("ds", "en", "data"),
      "GET",
      "/api/v2/catalog/datasources/ds/enablements/en/datasets/data/metadata",
      jsonObject,
    ],
    [
      "datasets.updateMetadata",
      (client: CatalogClient) =>
        client.datasets.updateMetadata("ds", "en", "data", { owner: "team" }),
      "PUT",
      "/api/v2/catalog/datasources/ds/enablements/en/datasets/data/metadata",
      noContent,
    ],
    [
      "datasets.addDocument",
      (client: CatalogClient) =>
        client.datasets.addDocument("ds", "en", "data", document),
      "POST",
      "/api/v2/catalog/datasources/ds/enablements/en/datasets/data/documents",
      jsonObject,
    ],
    [
      "datasets.documents",
      (client: CatalogClient) => client.datasets.documents("ds", "en", "data"),
      "GET",
      "/api/v2/catalog/datasources/ds/enablements/en/datasets/data/documents",
      jsonArray,
    ],
    [
      "datasets.document",
      (client: CatalogClient) =>
        client.datasets.document("ds", "en", "data", "doc"),
      "GET",
      "/api/v2/catalog/datasources/ds/enablements/en/datasets/data/documents/doc",
      jsonObject,
    ],
    [
      "datasets.deleteDocument",
      (client: CatalogClient) =>
        client.datasets.deleteDocument("ds", "en", "data", "doc"),
      "DELETE",
      "/api/v2/catalog/datasources/ds/enablements/en/datasets/data/documents/doc",
      noContent,
    ],
    [
      "datasets.ingestionStatuses",
      (client: CatalogClient) => client.datasets.ingestionStatuses("ds", "en"),
      "GET",
      "/api/v2/catalog/datasources/ds/enablements/en/datasets/all/ingestion",
      jsonArray,
    ],
    [
      "datasets.ingestionStatusesForDataSource",
      (client: CatalogClient) =>
        client.datasets.ingestionStatusesForDataSource("ds", {
          state: "running",
        }),
      "GET",
      "/api/v2/catalog/datasources/ds/enablements/all/datasets/all/ingestion?state=running",
      jsonArray,
    ],
    [
      "storages.list",
      (client: CatalogClient) => client.storages.list({ datasetId: "data" }),
      "GET",
      "/api/v2/catalog/storages?datasetId=data",
      jsonArray,
    ],
    [
      "storages.count",
      (client: CatalogClient) => client.storages.count(),
      "HEAD",
      "/api/v2/catalog/storages",
      count,
    ],
    [
      "storages.create",
      (client: CatalogClient) => client.storages.create(storage),
      "POST",
      "/api/v2/catalog/storages",
      noContent,
    ],
    [
      "storages.deleteAll",
      (client: CatalogClient) =>
        client.storages.deleteAll({ datasetId: "data" }),
      "DELETE",
      "/api/v2/catalog/storages?datasetId=data",
      noContent,
    ],
    [
      "storages.get",
      (client: CatalogClient) => client.storages.get("st"),
      "GET",
      "/api/v2/catalog/storages/st",
      jsonObject,
    ],
    [
      "storages.delete",
      (client: CatalogClient) => client.storages.delete("st"),
      "DELETE",
      "/api/v2/catalog/storages/st",
      noContent,
    ],
    [
      "storages.update",
      (client: CatalogClient) => client.storages.update("st", storage),
      "PUT",
      "/api/v2/catalog/storages/st",
      noContent,
    ],
    [
      "storages.patch",
      (client: CatalogClient) => client.storages.patch("st", storage),
      "PATCH",
      "/api/v2/catalog/storages/st",
      noContent,
    ],
    [
      "search.global",
      (client: CatalogClient) => client.search.global({ query: "tracks" }),
      "POST",
      "/api/v2/catalog/search",
      jsonArray,
    ],
  ])(
    "maps %s to the expected request",
    async (_, call, method, path, response) => {
      const fetch = vi.fn(response);
      const client = createCatalog(fetch);

      await call(client);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
      const actual = new URL(url);
      expect(`${actual.pathname}${actual.search}`).toBe(path);
      expect(init.method).toBe(method);
    },
  );

  it("lists datasources with catalog base path, query params, and API key auth", async () => {
    const fetch = vi.fn(async () =>
      Response.json([{ name: "Source", dynamicDiscovery: true }]),
    );
    const client = createCatalog(fetch);

    const result = await client.dataSources.list({
      labels: ["prod", "trusted"],
      status: "active",
    });

    expect(result).toEqual([{ name: "Source", dynamicDiscovery: true }]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://rdp.example.com/api/v2/catalog/datasources?labels=prod&labels=trusted&status=active",
    );
    expect(init.method).toBe("GET");
    const headers = new Headers(init.headers);
    expect(headers.get("X-API-Key")).toBe("ak-123");
    expect(headers.get("User-Agent")).toMatch(/^rdp-sdk-typescript\//);
  });

  it("parses Count headers for HEAD endpoints", async () => {
    const fetch = vi.fn(
      async () => new Response(null, { status: 200, headers: { Count: "7" } }),
    );
    const client = createCatalog(fetch);

    await expect(client.datasets.count({ name: "tracks" })).resolves.toBe(7);

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://rdp.example.com/api/v2/catalog/datasets?name=tracks",
    );
    expect(init.method).toBe("HEAD");
  });

  it("requests JSON and protobuf media types for dataset schemas", async () => {
    const fetch = vi.fn(
      async () =>
        new Response("message Example {}", {
          headers: { "Content-Type": "application/x-protobuf-schema" },
        }),
    );
    const client = createCatalog(fetch);

    await client.datasets.schema("dataset/1", { raw: true });

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://rdp.example.com/api/v2/catalog/datasets/dataset%2F1/schema?raw=true",
    );
    expect(new Headers(init.headers).get("Accept")).toBe(
      "application/json, application/x-protobuf-schema",
    );
  });

  it("accepts partial bodies for strategic patches", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createCatalog(fetch);
    const dataSourcePatch: DataSourcePatch = { labels: ["trusted"] };
    const datasetPatch: DataSetPatch = { labels: ["trusted"] };

    await client.dataSources.patch("source/1", dataSourcePatch);
    await client.datasets.patch("dataset/1", datasetPatch);

    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string)).toEqual(
      dataSourcePatch,
    );
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body as string)).toEqual(
      datasetPatch,
    );
  });

  it("sends JSON Patch content for schema hint patches", async () => {
    const fetch = vi.fn(async () => Response.json({ geographic: {} }));
    const client = createCatalog(fetch);

    await client.datasets.patchSchemaHints("dataset/1", [
      { op: "replace", path: "/geographic/latitude", value: "lat" },
    ]);

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://rdp.example.com/api/v2/catalog/datasets/dataset%2F1/schema/hints",
    );
    expect(init.method).toBe("PATCH");
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json-patch+json",
    );
    expect(init.body).toBe(
      JSON.stringify([
        { op: "replace", path: "/geographic/latitude", value: "lat" },
      ]),
    );
  });

  it("uses cached OAuth2 bearer tokens for REST requests", async () => {
    const fetch = vi.fn(async () => Response.json([]));
    const tokenFetcher = vi.fn(async () => ({
      access_token: "token-1",
      expires_in: 60,
    }));
    const client = createCatalogClient(
      new RestTransport({
        endpoint: "https://rdp.example.com",
        basePath: catalogBasePath(),
        auth: {
          method: "client_credentials",
          clientId: "client",
          clientSecret: "secret",
        },
        tokenFetcher,
        logger,
        fetch,
      }),
    );

    await client.storages.list();
    await client.storages.list();

    expect(tokenFetcher).toHaveBeenCalledTimes(1);
    expect(tokenFetcher.mock.calls[0]?.[0]).toBe(
      "https://rdp.example.com/api/v1/auth/token",
    );
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer token-1",
    );
  });

  it("throws response details for non-2xx responses", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ message: "missing" }, { status: 404 }),
    );
    const client = createCatalog(fetch);

    await expect(client.datasets.get("missing")).rejects.toMatchObject({
      status: 404,
      body: { message: "missing" },
    });
  });

  it("routes fluent helpers to active catalog endpoints", async () => {
    const dataSource = { id: "source/id" } as unknown as DataSource;
    const enablement = {
      id: "enablement/id",
    } as unknown as DataSourceEnablement;
    const enablementRequest = {
      id: "enablement/id",
    } as unknown as DataSourceEnablementRequest;
    const dataset = { id: "dataset/id" } as unknown as DataSet;
    const storage = { id: "storage/id" } as unknown as DataSetStorage;
    const document = { name: "doc" } as unknown as AddDocumentRequest;
    const ingestion = { status: "running" } as unknown as Ingestion;
    const schemaHints = { geographic: {} } as unknown as SchemaHints;
    const accessControls = { groups: [] } as unknown as AccessControls;
    const datasetMetadata = { owner: "catalog" } as DatasetMetadata;
    const filterRequest = {
      name: "filtered",
    } as unknown as CreateFilteredDatasetRequest;
    const searchRequest = { query: "tracks" } as unknown as GlobalSearchRequest;
    const patch = [
      { op: "replace", path: "/name", value: "updated" },
    ] as JsonPatchOperation[];

    const scenarios: RouteScenario[] = [
      {
        name: "dataSources.count",
        method: "HEAD",
        path: "/datasources",
        call: (client) => client.dataSources.count(),
      },
      {
        name: "dataSources.create",
        method: "POST",
        path: "/datasources",
        call: (client) => client.dataSources.create(dataSource),
      },
      {
        name: "dataSources.get",
        method: "GET",
        path: "/datasources/source%2Fid",
        call: (client) => client.dataSources.get("source/id"),
      },
      {
        name: "dataSources.update",
        method: "PUT",
        path: "/datasources/source%2Fid",
        call: (client) => client.dataSources.update("source/id", dataSource),
      },
      {
        name: "dataSources.patch",
        method: "PATCH",
        path: "/datasources/source%2Fid",
        call: (client) => client.dataSources.patch("source/id", dataSource),
      },
      {
        name: "dataSources.delete",
        method: "DELETE",
        path: "/datasources/source%2Fid",
        call: (client) => client.dataSources.delete("source/id"),
      },
      {
        name: "dataSources.addLabels",
        method: "POST",
        path: "/datasources/source%2Fid/labels",
        call: (client) => client.dataSources.addLabels("source/id", ["prod"]),
      },
      {
        name: "dataSources.labels",
        method: "GET",
        path: "/datasources/source%2Fid/labels",
        call: (client) => client.dataSources.labels("source/id"),
      },
      {
        name: "dataSources.countLabels",
        method: "HEAD",
        path: "/datasources/source%2Fid/labels",
        call: (client) => client.dataSources.countLabels("source/id"),
      },
      {
        name: "dataSources.updateLabels",
        method: "PUT",
        path: "/datasources/source%2Fid/labels",
        call: (client) =>
          client.dataSources.updateLabels("source/id", ["prod"]),
      },
      {
        name: "dataSources.deleteLabels",
        method: "DELETE",
        path: "/datasources/source%2Fid/labels",
        call: (client) =>
          client.dataSources.deleteLabels("source/id", ["prod"]),
      },
      {
        name: "dataSources.addDocument",
        method: "POST",
        path: "/datasources/source%2Fid/documents",
        call: (client) => client.dataSources.addDocument("source/id", document),
      },
      {
        name: "dataSources.documents",
        method: "GET",
        path: "/datasources/source%2Fid/documents",
        call: (client) => client.dataSources.documents("source/id"),
      },
      {
        name: "dataSources.document",
        method: "GET",
        path: "/datasources/source%2Fid/documents/doc%2Fid",
        call: (client) => client.dataSources.document("source/id", "doc/id"),
      },
      {
        name: "dataSources.deleteDocument",
        method: "DELETE",
        path: "/datasources/source%2Fid/documents/doc%2Fid",
        call: (client) =>
          client.dataSources.deleteDocument("source/id", "doc/id"),
      },
      {
        name: "dataSources.allEnablements",
        method: "GET",
        path: "/datasources/all/enablements",
        call: (client) => client.dataSources.allEnablements(),
      },
      {
        name: "dataSources.countAllEnablements",
        method: "HEAD",
        path: "/datasources/all/enablements",
        call: (client) => client.dataSources.countAllEnablements(),
      },
      {
        name: "dataSources.datasets",
        method: "GET",
        path: "/datasources/source%2Fid/enablements/all/datasets",
        call: (client) => client.dataSources.datasets("source/id"),
      },
      {
        name: "dataSources.countDatasets",
        method: "HEAD",
        path: "/datasources/source%2Fid/enablements/all/datasets",
        call: (client) => client.dataSources.countDatasets("source/id"),
      },
      {
        name: "dataSources.allDatasets",
        method: "GET",
        path: "/datasources/all/enablements/all/datasets",
        call: (client) => client.dataSources.allDatasets(),
      },
      {
        name: "dataSources.countAllDatasets",
        method: "HEAD",
        path: "/datasources/all/enablements/all/datasets",
        call: (client) => client.dataSources.countAllDatasets(),
      },
      {
        name: "enablements.list",
        method: "GET",
        path: "/enablements",
        call: (client) => client.enablements.list(),
      },
      {
        name: "enablements.count",
        method: "HEAD",
        path: "/enablements",
        call: (client) => client.enablements.count(),
      },
      {
        name: "enablements.create",
        method: "POST",
        path: "/enablements",
        call: (client) => client.enablements.create(enablementRequest),
      },
      {
        name: "enablements.deleteAll",
        method: "DELETE",
        path: "/enablements",
        call: (client) => client.enablements.deleteAll({} as never),
      },
      {
        name: "enablements.get",
        method: "GET",
        path: "/enablements/enablement%2Fid",
        call: (client) => client.enablements.get("enablement/id"),
      },
      {
        name: "enablements.update",
        method: "PUT",
        path: "/enablements/enablement%2Fid",
        call: (client) =>
          client.enablements.update("enablement/id", enablement),
      },
      {
        name: "enablements.patch",
        method: "PATCH",
        path: "/enablements/enablement%2Fid",
        call: (client) => client.enablements.patch("enablement/id", enablement),
      },
      {
        name: "enablements.delete",
        method: "DELETE",
        path: "/enablements/enablement%2Fid",
        call: (client) => client.enablements.delete("enablement/id"),
      },
      {
        name: "datasets.list",
        method: "GET",
        path: "/datasets",
        call: (client) => client.datasets.list(),
      },
      {
        name: "datasets.create",
        method: "POST",
        path: "/datasets",
        call: (client) => client.datasets.create(dataset),
      },
      {
        name: "datasets.deleteAll",
        method: "DELETE",
        path: "/datasets",
        call: (client) => client.datasets.deleteAll({} as never),
      },
      {
        name: "datasets.update",
        method: "PUT",
        path: "/datasets/dataset%2Fid",
        call: (client) => client.datasets.update("dataset/id", dataset),
      },
      {
        name: "datasets.patch",
        method: "PATCH",
        path: "/datasets/dataset%2Fid",
        call: (client) => client.datasets.patch("dataset/id", dataset),
      },
      {
        name: "datasets.delete",
        method: "DELETE",
        path: "/datasets/dataset%2Fid",
        call: (client) => client.datasets.delete("dataset/id"),
      },
      {
        name: "datasets.addLabels",
        method: "POST",
        path: "/datasets/dataset%2Fid/labels",
        call: (client) => client.datasets.addLabels("dataset/id", ["prod"]),
      },
      {
        name: "datasets.labels",
        method: "GET",
        path: "/datasets/dataset%2Fid/labels",
        call: (client) => client.datasets.labels("dataset/id"),
      },
      {
        name: "datasets.countLabels",
        method: "HEAD",
        path: "/datasets/dataset%2Fid/labels",
        call: (client) => client.datasets.countLabels("dataset/id"),
      },
      {
        name: "datasets.updateLabels",
        method: "PUT",
        path: "/datasets/dataset%2Fid/labels",
        call: (client) => client.datasets.updateLabels("dataset/id", ["prod"]),
      },
      {
        name: "datasets.deleteLabels",
        method: "DELETE",
        path: "/datasets/dataset%2Fid/labels",
        call: (client) => client.datasets.deleteLabels("dataset/id", ["prod"]),
      },
      {
        name: "datasets.startIngestion",
        method: "POST",
        path: "/datasets/dataset%2Fid/ingestion",
        call: (client) =>
          client.datasets.startIngestion("dataset/id", ingestion),
      },
      {
        name: "datasets.stopIngestion",
        method: "DELETE",
        path: "/datasets/dataset%2Fid/ingestion",
        call: (client) => client.datasets.stopIngestion("dataset/id"),
      },
      {
        name: "datasets.ingestionStatus",
        method: "GET",
        path: "/datasets/dataset%2Fid/ingestion",
        call: (client) => client.datasets.ingestionStatus("dataset/id"),
      },
      {
        name: "datasets.patchIngestion",
        method: "PATCH",
        path: "/datasets/dataset%2Fid/ingestion",
        call: (client) =>
          client.datasets.patchIngestion("dataset/id", ingestion),
      },
      {
        name: "datasets.schema",
        method: "GET",
        path: "/datasets/dataset%2Fid/schema",
        call: (client) => client.datasets.schema("dataset/id"),
      },
      {
        name: "datasets.updateSchema",
        method: "PUT",
        path: "/datasets/dataset%2Fid/schema",
        contentType: "application/x-protobuf-schema",
        call: (client) =>
          client.datasets.updateSchema("dataset/id", "schema", {
            contentType: "application/x-protobuf-schema",
          }),
      },
      {
        name: "datasets.schemaHints",
        method: "GET",
        path: "/datasets/dataset%2Fid/schema/hints",
        call: (client) => client.datasets.schemaHints("dataset/id"),
      },
      {
        name: "datasets.updateSchemaHints",
        method: "PUT",
        path: "/datasets/dataset%2Fid/schema/hints",
        call: (client) =>
          client.datasets.updateSchemaHints("dataset/id", schemaHints),
      },
      {
        name: "datasets.deleteSchemaHints",
        method: "DELETE",
        path: "/datasets/dataset%2Fid/schema/hints",
        call: (client) => client.datasets.deleteSchemaHints("dataset/id"),
      },
      {
        name: "datasets.accessControls",
        method: "GET",
        path: "/datasets/dataset%2Fid/access-controls",
        call: (client) => client.datasets.accessControls("dataset/id"),
      },
      {
        name: "datasets.replaceAccessControls",
        method: "PUT",
        path: "/datasets/dataset%2Fid/access-controls",
        call: (client) =>
          client.datasets.replaceAccessControls("dataset/id", accessControls),
      },
      {
        name: "datasets.patchAccessControls",
        method: "PATCH",
        path: "/datasets/dataset%2Fid/access-controls",
        contentType: "application/json-patch+json",
        call: (client) =>
          client.datasets.patchAccessControls("dataset/id", patch),
      },
      {
        name: "datasets.deleteAccessControls",
        method: "DELETE",
        path: "/datasets/dataset%2Fid/access-controls",
        call: (client) => client.datasets.deleteAccessControls("dataset/id"),
      },
      {
        name: "datasets.deleteAccessControl",
        method: "DELETE",
        path: "/datasets/dataset%2Fid/access-controls/access%2Fid",
        call: (client) =>
          client.datasets.deleteAccessControl("dataset/id", "access/id"),
      },
      {
        name: "datasets.derived",
        method: "GET",
        path: "/datasets/dataset%2Fid/filters",
        call: (client) => client.datasets.derived("dataset/id"),
      },
      {
        name: "datasets.createFilter",
        method: "POST",
        path: "/datasets/dataset%2Fid/filters",
        call: (client) =>
          client.datasets.createFilter("dataset/id", filterRequest),
      },
      {
        name: "datasets.pipelines",
        method: "GET",
        path: "/datasets/dataset%2Fid/pipelines",
        call: (client) => client.datasets.pipelines("dataset/id"),
      },
      {
        name: "datasets.metadata",
        method: "GET",
        path: "/datasources/source%2Fid/enablements/enablement%2Fid/datasets/dataset%2Fid/metadata",
        call: (client) =>
          client.datasets.metadata("source/id", "enablement/id", "dataset/id"),
      },
      {
        name: "datasets.updateMetadata",
        method: "PUT",
        path: "/datasources/source%2Fid/enablements/enablement%2Fid/datasets/dataset%2Fid/metadata",
        call: (client) =>
          client.datasets.updateMetadata(
            "source/id",
            "enablement/id",
            "dataset/id",
            datasetMetadata,
          ),
      },
      {
        name: "datasets.addDocument",
        method: "POST",
        path: "/datasources/source%2Fid/enablements/enablement%2Fid/datasets/dataset%2Fid/documents",
        call: (client) =>
          client.datasets.addDocument(
            "source/id",
            "enablement/id",
            "dataset/id",
            document,
          ),
      },
      {
        name: "datasets.documents",
        method: "GET",
        path: "/datasources/source%2Fid/enablements/enablement%2Fid/datasets/dataset%2Fid/documents",
        call: (client) =>
          client.datasets.documents("source/id", "enablement/id", "dataset/id"),
      },
      {
        name: "datasets.document",
        method: "GET",
        path: "/datasources/source%2Fid/enablements/enablement%2Fid/datasets/dataset%2Fid/documents/doc%2Fid",
        call: (client) =>
          client.datasets.document(
            "source/id",
            "enablement/id",
            "dataset/id",
            "doc/id",
          ),
      },
      {
        name: "datasets.deleteDocument",
        method: "DELETE",
        path: "/datasources/source%2Fid/enablements/enablement%2Fid/datasets/dataset%2Fid/documents/doc%2Fid",
        call: (client) =>
          client.datasets.deleteDocument(
            "source/id",
            "enablement/id",
            "dataset/id",
            "doc/id",
          ),
      },
      {
        name: "datasets.ingestionStatuses",
        method: "GET",
        path: "/datasources/source%2Fid/enablements/enablement%2Fid/datasets/all/ingestion",
        call: (client) =>
          client.datasets.ingestionStatuses("source/id", "enablement/id"),
      },
      {
        name: "datasets.ingestionStatusesForDataSource",
        method: "GET",
        path: "/datasources/source%2Fid/enablements/all/datasets/all/ingestion",
        call: (client) =>
          client.datasets.ingestionStatusesForDataSource("source/id"),
      },
      {
        name: "storages.count",
        method: "HEAD",
        path: "/storages",
        call: (client) => client.storages.count(),
      },
      {
        name: "storages.create",
        method: "POST",
        path: "/storages",
        call: (client) => client.storages.create(storage),
      },
      {
        name: "storages.deleteAll",
        method: "DELETE",
        path: "/storages",
        call: (client) => client.storages.deleteAll({} as never),
      },
      {
        name: "storages.get",
        method: "GET",
        path: "/storages/storage%2Fid",
        call: (client) => client.storages.get("storage/id"),
      },
      {
        name: "storages.delete",
        method: "DELETE",
        path: "/storages/storage%2Fid",
        call: (client) => client.storages.delete("storage/id"),
      },
      {
        name: "storages.update",
        method: "PUT",
        path: "/storages/storage%2Fid",
        call: (client) => client.storages.update("storage/id", storage),
      },
      {
        name: "storages.patch",
        method: "PATCH",
        path: "/storages/storage%2Fid",
        call: (client) => client.storages.patch("storage/id", storage),
      },
      {
        name: "search.global",
        method: "POST",
        path: "/search",
        call: (client) => client.search.global(searchRequest),
      },
    ];

    for (const scenario of scenarios) {
      const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: { Count: "11" },
          });
        }
        return Response.json({ ok: true });
      });
      const client = createCatalog(fetch);

      await expect(scenario.call(client), scenario.name).resolves.not.toThrow();

      expect(fetch, scenario.name).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
      expect(url, scenario.name).toBe(
        `https://rdp.example.com/api/v2/catalog${scenario.path}`,
      );
      expect(init.method, scenario.name).toBe(scenario.method);
      if (scenario.contentType) {
        expect(
          new Headers(init.headers).get("Content-Type"),
          scenario.name,
        ).toBe(scenario.contentType);
      }
    }
  });
});
