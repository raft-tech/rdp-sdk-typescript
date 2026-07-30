import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/internal/logger.js";
import {
  type FetchLike,
  RestApiError,
  RestTransport,
} from "../../src/internal/rest.js";
import {
  type PipelinesAccess,
  type PipelinesBatchAccessControlRequest,
  type PipelinesClient,
  type PipelinesCreatePipelineQosConfigurationRequest,
  type PipelinesInstantiateTemplateRequest,
  type PipelinesPipeline,
  type PipelinesPipelineExportRequest,
  type PipelinesPipelineImportRequest,
  type PipelinesPipelineLayoutUpdate,
  type PipelinesPipelinePatch,
  type PipelinesPipelineTemplateRequestBody,
  type PipelinesUpdatePipelineQosConfigurationRequest,
  createPipelinesClient,
  pipelinesBasePath,
} from "../../src/pipelines/index.js";

const logger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function createPipelines(fetch: FetchLike): PipelinesClient {
  return createPipelinesClient(
    new RestTransport({
      endpoint: "https://rdp.example.com",
      basePath: pipelinesBasePath(),
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
  call: (client: PipelinesClient) => Promise<unknown>;
}

describe("PipelinesClient", () => {
  const jsonObject = async () => Response.json({ uid: "created" });
  const jsonArray = async () => Response.json([]);
  const noBody = async () => new Response(null, { status: 200 });
  const eventStream = async () =>
    new Response("event: message\ndata: {}\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });

  const pipeline = { name: "Pipeline" } as unknown as PipelinesPipeline;
  const importRequest = {
    pipeline,
  } as unknown as PipelinesPipelineImportRequest;
  const exportRequest = {} as unknown as PipelinesPipelineExportRequest;
  const patch = {} as unknown as PipelinesPipelinePatch;
  const layout = {} as unknown as PipelinesPipelineLayoutUpdate;
  const accessRequest = {
    operations: [],
  } as unknown as PipelinesBatchAccessControlRequest;
  const template = {} as unknown as PipelinesPipelineTemplateRequestBody;
  const templateRequest = {} as unknown as PipelinesInstantiateTemplateRequest;
  const qosCreate =
    {} as unknown as PipelinesCreatePipelineQosConfigurationRequest;
  const qosUpdate =
    {} as unknown as PipelinesUpdatePipelineQosConfigurationRequest;

  it.each<RouteScenario>([
    {
      name: "canvasCatalog.get",
      method: "GET",
      path: "/api/v2/pipelines/canvas/catalog",
      response: jsonObject,
      call: (client) => client.canvasCatalog.get(),
    },
    {
      name: "instances.create",
      method: "POST",
      path: "/api/v2/pipelines/instance/create",
      response: jsonObject,
      call: (client) => client.instances.create(pipeline),
    },
    {
      name: "instances.importBundle",
      method: "POST",
      path: "/api/v2/pipelines/instance/import",
      response: jsonObject,
      call: (client) => client.instances.importBundle(importRequest),
    },
    {
      name: "instances.list",
      method: "GET",
      path: "/api/v2/pipelines/instance/all",
      response: jsonArray,
      call: (client) => client.instances.list(),
    },
    {
      name: "instances.get",
      method: "GET",
      path: "/api/v2/pipelines/instance/pipe%2Fid",
      response: jsonObject,
      call: (client) => client.instances.get("pipe/id"),
    },
    {
      name: "instances.update",
      method: "PUT",
      path: "/api/v2/pipelines/instance/pipe%2Fid",
      response: jsonObject,
      call: (client) => client.instances.update("pipe/id", pipeline),
    },
    {
      name: "instances.patch",
      method: "PATCH",
      path: "/api/v2/pipelines/instance/pipe%2Fid",
      response: jsonObject,
      call: (client) => client.instances.patch("pipe/id", patch),
    },
    {
      name: "instances.delete",
      method: "DELETE",
      path: "/api/v2/pipelines/instance/pipe%2Fid",
      response: noBody,
      call: (client) => client.instances.delete("pipe/id"),
    },
    {
      name: "instances.exportBundle",
      method: "POST",
      path: "/api/v2/pipelines/instance/pipe%2Fid/export",
      response: jsonObject,
      call: (client) => client.instances.exportBundle("pipe/id", exportRequest),
    },
    {
      name: "instances.start",
      method: "POST",
      path: "/api/v2/pipelines/instance/pipe%2Fid/start",
      response: noBody,
      call: (client) => client.instances.start("pipe/id"),
    },
    {
      name: "instances.stop",
      method: "POST",
      path: "/api/v2/pipelines/instance/pipe%2Fid/stop",
      response: noBody,
      call: (client) => client.instances.stop("pipe/id"),
    },
    {
      name: "instances.restart",
      method: "POST",
      path: "/api/v2/pipelines/instance/pipe%2Fid/restart",
      response: noBody,
      call: (client) => client.instances.restart("pipe/id"),
    },
    {
      name: "instances.status",
      method: "GET",
      path: "/api/v2/pipelines/instance/pipe%2Fid/status",
      response: jsonObject,
      call: (client) => client.instances.status("pipe/id"),
    },
    {
      name: "events.all",
      method: "GET",
      path: "/api/v2/pipelines/instance/events/all",
      response: eventStream,
      call: (client) => client.events.all(),
    },
    {
      name: "events.pipeline",
      method: "GET",
      path: "/api/v2/pipelines/instance/events/pipe%2Fid",
      response: eventStream,
      call: (client) => client.events.pipeline("pipe/id"),
    },
    {
      name: "events.transformerLogs",
      method: "GET",
      path: "/api/v2/pipelines/instance/pipe%2Fid/transformer/xf%2Fid/logs",
      response: eventStream,
      call: (client) => client.events.transformerLogs("pipe/id", "xf/id"),
    },
    {
      name: "instances.updateLayout",
      method: "PUT",
      path: "/api/v2/pipelines/instance/pipe%2Fid/layout",
      response: noBody,
      call: (client) => client.instances.updateLayout("pipe/id", layout),
    },
    {
      name: "instances.accessControls",
      method: "GET",
      path: "/api/v2/pipelines/instance/pipe%2Fid/access-controls",
      response: jsonArray,
      call: (client) => client.instances.accessControls("pipe/id"),
    },
    {
      name: "instances.updateAccessControls",
      method: "POST",
      path: "/api/v2/pipelines/instance/pipe%2Fid/access-controls",
      response: jsonObject,
      call: (client) =>
        client.instances.updateAccessControls("pipe/id", accessRequest),
    },
    {
      name: "instances.deleteAccessControl",
      method: "DELETE",
      path: "/api/v2/pipelines/instance/pipe%2Fid/access-controls/urn%3Ardp%3Auser%3Aalice",
      response: noBody,
      call: (client) =>
        client.instances.deleteAccessControl("pipe/id", "urn:rdp:user:alice"),
    },
    {
      name: "templates.create",
      method: "POST",
      path: "/api/v2/pipelines/template/create",
      response: jsonObject,
      call: (client) => client.templates.create(template),
    },
    {
      name: "templates.get",
      method: "GET",
      path: "/api/v2/pipelines/template/template%2Fid",
      response: jsonObject,
      call: (client) => client.templates.get("template/id"),
    },
    {
      name: "templates.update",
      method: "PUT",
      path: "/api/v2/pipelines/template/template%2Fid",
      response: jsonObject,
      call: (client) => client.templates.update("template/id", template),
    },
    {
      name: "templates.delete",
      method: "DELETE",
      path: "/api/v2/pipelines/template/template%2Fid",
      response: noBody,
      call: (client) => client.templates.delete("template/id"),
    },
    {
      name: "templates.list",
      method: "GET",
      path: "/api/v2/pipelines/template/all",
      response: jsonArray,
      call: (client) => client.templates.list(),
    },
    {
      name: "templates.accessControls",
      method: "GET",
      path: "/api/v2/pipelines/template/template%2Fid/access-controls",
      response: jsonArray,
      call: (client) => client.templates.accessControls("template/id"),
    },
    {
      name: "templates.updateAccessControls",
      method: "POST",
      path: "/api/v2/pipelines/template/template%2Fid/access-controls",
      response: jsonObject,
      call: (client) =>
        client.templates.updateAccessControls("template/id", accessRequest),
    },
    {
      name: "templates.deleteAccessControl",
      method: "DELETE",
      path: "/api/v2/pipelines/template/template%2Fid/access-controls/urn%3Ardp%3Agroup%3Adevs",
      response: noBody,
      call: (client) =>
        client.templates.deleteAccessControl(
          "template/id",
          "urn:rdp:group:devs",
        ),
    },
    {
      name: "templates.apply",
      method: "POST",
      path: "/api/v2/pipelines/template/template%2Fid/apply",
      response: jsonObject,
      call: (client) => client.templates.apply("template/id", templateRequest),
    },
    {
      name: "migration.migrateAll",
      method: "POST",
      path: "/api/v2/pipelines/migration/migrate/all",
      response: jsonObject,
      call: (client) => client.migration.migrateAll(),
    },
    {
      name: "migration.migrate",
      method: "POST",
      path: "/api/v2/pipelines/migration/migrate/pipe%2Fid",
      response: jsonObject,
      call: (client) => client.migration.migrate("pipe/id"),
    },
    {
      name: "migration.createInstance",
      method: "POST",
      path: "/api/v2/pipelines/migration/instance/create",
      response: jsonObject,
      call: (client) => client.migration.createInstance(pipeline),
    },
    {
      name: "migration.listInstances",
      method: "GET",
      path: "/api/v2/pipelines/migration/instance/all",
      response: jsonArray,
      call: (client) => client.migration.listInstances(),
    },
    {
      name: "migration.getInstance",
      method: "GET",
      path: "/api/v2/pipelines/migration/instance/pipe%2Fid",
      response: jsonObject,
      call: (client) => client.migration.getInstance("pipe/id"),
    },
    {
      name: "migration.updateInstance",
      method: "PUT",
      path: "/api/v2/pipelines/migration/instance/pipe%2Fid",
      response: jsonObject,
      call: (client) => client.migration.updateInstance("pipe/id", pipeline),
    },
    {
      name: "migration.deleteInstance",
      method: "DELETE",
      path: "/api/v2/pipelines/migration/instance/pipe%2Fid",
      response: noBody,
      call: (client) => client.migration.deleteInstance("pipe/id"),
    },
    {
      name: "qos.listConfigurations",
      method: "GET",
      path: "/api/v2/pipelines/qos/configurations",
      response: jsonArray,
      call: (client) => client.qos.listConfigurations(),
    },
    {
      name: "qos.createConfiguration",
      method: "POST",
      path: "/api/v2/pipelines/qos/configurations",
      response: jsonObject,
      call: (client) => client.qos.createConfiguration(qosCreate),
    },
    {
      name: "qos.getConfiguration",
      method: "GET",
      path: "/api/v2/pipelines/qos/configuration/NETWORK/HIGH",
      response: jsonObject,
      call: (client) => client.qos.getConfiguration("NETWORK", "HIGH"),
    },
    {
      name: "qos.updateConfiguration",
      method: "PUT",
      path: "/api/v2/pipelines/qos/configuration/NETWORK/HIGH",
      response: noBody,
      call: (client) =>
        client.qos.updateConfiguration("NETWORK", "HIGH", qosUpdate),
    },
    {
      name: "qos.deleteConfiguration",
      method: "DELETE",
      path: "/api/v2/pipelines/qos/configuration/NETWORK/HIGH",
      response: noBody,
      call: (client) => client.qos.deleteConfiguration("NETWORK", "HIGH"),
    },
  ])(
    "routes $name to $method $path",
    async ({ method, path, response, call }) => {
      const fetch = vi.fn(response);
      const client = createPipelines(fetch);

      const result = await call(client);
      if (result instanceof Response) {
        await result.body?.cancel();
      }

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
      const actual = new URL(url);
      expect(`${actual.pathname}${actual.search}`).toBe(path);
      expect(init.method).toBe(method);
    },
  );

  it("serializes pipeline explode:false arrays as comma-separated query values", async () => {
    const fetch = vi.fn(async () => Response.json([]));
    const client = createPipelines(fetch);

    await client.instances.list({
      labels: ["prod", "trusted"],
      annotations: ["owner=rdp", "tier=gold"],
      created_by: "urn:rdp:user:alice",
      detail: "minimal",
    });

    const [url] = fetch.mock.calls[0] as [string, RequestInit];
    const actual = new URL(url);
    expect(actual.pathname).toBe("/api/v2/pipelines/instance/all");
    expect(actual.searchParams.get("labels")).toBe("prod,trusted");
    expect(actual.searchParams.get("annotations")).toBe("owner=rdp,tier=gold");
    expect(actual.searchParams.getAll("labels")).toHaveLength(1);
    expect(actual.searchParams.get("created_by")).toBe("urn:rdp:user:alice");
    expect(actual.searchParams.get("detail")).toBe("minimal");
  });

  it("serializes template explode:false arrays as comma-separated query values", async () => {
    const fetch = vi.fn(async () => Response.json([]));
    const client = createPipelines(fetch);

    await client.templates.list({
      labels: ["starter", "shared"],
      annotations: ["domain=ais", "env=prod"],
      created_by: "urn:rdp:user:bob",
    });

    const [url] = fetch.mock.calls[0] as [string, RequestInit];
    const actual = new URL(url);
    expect(actual.pathname).toBe("/api/v2/pipelines/template/all");
    expect(actual.searchParams.get("labels")).toBe("starter,shared");
    expect(actual.searchParams.get("annotations")).toBe("domain=ais,env=prod");
    expect(actual.searchParams.getAll("annotations")).toHaveLength(1);
  });

  it("accepts non-empty raw pipeline template definitions", async () => {
    const fetch = vi.fn(async () => Response.json({ uid: "template" }));
    const client = createPipelines(fetch);
    const request: PipelinesPipelineTemplateRequestBody = {
      name: "Templated pipeline",
      pipeline_template: {
        name: "Pipeline ${{ project_name }}",
        transformers: [
          {
            uid: "t1",
            configuration: {
              replicas: "${{ replica_count }}",
            },
          },
        ],
        datasets: [],
        connections: [],
      },
    };

    await client.templates.create(request);

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(request);
  });

  it("uses the pipelines base path, JSON headers, and API key auth", async () => {
    const fetch = vi.fn(async () => Response.json([]));
    const client = createPipelines(fetch);

    await client.instances.list({ detail: "nodes" });

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://rdp.example.com/api/v2/pipelines/instance/all?detail=nodes",
    );
    const headers = new Headers(init.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("X-API-Key")).toBe("ak-123");
    expect(headers.get("User-Agent")).toMatch(/^rdp-sdk-typescript\//);
  });

  it("rejects empty path identifiers before dispatch", () => {
    const fetch = vi.fn(async () => Response.json({}));
    const client = createPipelines(fetch);

    expect(() => client.instances.get("")).toThrow("rdp: uid is required");
    expect(() => client.events.transformerLogs("pipe", "")).toThrow(
      "rdp: transformerInstanceUid is required",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns raw SSE responses without buffering the stream", async () => {
    const fetch = vi.fn(
      async () =>
        new Response('event: message\ndata: {"state":"active"}\n\n', {
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    const client = createPipelines(fetch);

    const response = await client.events.pipeline("pipe/id", { history: true });

    expect(response).toBeInstanceOf(Response);
    expect(await response.text()).toContain('"state":"active"');
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://rdp.example.com/api/v2/pipelines/instance/events/pipe%2Fid?history=true",
    );
    expect(new Headers(init.headers).get("Accept")).toBe("text/event-stream");
  });

  it("throws response details for JSON endpoint errors", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ message: "missing" }, { status: 404 }),
    );
    const client = createPipelines(fetch);

    await expect(client.instances.get("missing")).rejects.toMatchObject({
      status: 404,
      body: { message: "missing" },
    });
  });

  it("throws response details for raw stream endpoint errors", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ message: "not active" }, { status: 400 }),
    );
    const client = createPipelines(fetch);

    let error: unknown;
    try {
      await client.events.transformerLogs("pipe", "xf");
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(RestApiError);
    expect(error).toMatchObject({
      status: 400,
      body: { message: "not active" },
    });
  });

  it("accepts typed access control payloads", async () => {
    const fetch = vi.fn(async () => Response.json({ results: [] }));
    const client = createPipelines(fetch);
    const access = [
      { entity: "urn:rdp:user:alice", read: true, write: false },
    ] as PipelinesAccess[];
    const request = {
      access_controls: access,
    } as unknown as PipelinesBatchAccessControlRequest;

    await client.instances.updateAccessControls("pipe", request);

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(request);
  });
});
