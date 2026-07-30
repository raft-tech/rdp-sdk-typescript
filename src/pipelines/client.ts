import { type RestTransport, encodePath } from "../internal/rest.js";
import type {
  PipelinesAccess,
  PipelinesApplyTemplateQuery,
  PipelinesApplyTemplateResponse,
  PipelinesBatchAccessControlRequest,
  PipelinesBatchAccessControlResponse,
  PipelinesCreateInstanceQuery,
  PipelinesCreateInstanceResponse,
  PipelinesCreateMigrationInstanceQuery,
  PipelinesCreatePipelineQosConfigurationRequest,
  PipelinesDetailedPipelineStatus,
  PipelinesEventsQuery,
  PipelinesExportInstanceQuery,
  PipelinesGetInstanceQuery,
  PipelinesIdResponse,
  PipelinesImportInstanceQuery,
  PipelinesImportInstanceResponse,
  PipelinesInstantiateTemplateRequest,
  PipelinesListInstancesQuery,
  PipelinesListTemplatesQuery,
  PipelinesMigrationResult,
  PipelinesPatchInstanceQuery,
  PipelinesPatchInstanceResponse,
  PipelinesPipeline,
  PipelinesPipelineCanvasCatalog,
  PipelinesPipelineEventsQuery,
  PipelinesPipelineExportBundle,
  PipelinesPipelineExportRequest,
  PipelinesPipelineImportRequest,
  PipelinesPipelineInstance,
  PipelinesPipelineLayoutUpdate,
  PipelinesPipelinePatch,
  PipelinesPipelineQosConfiguration,
  PipelinesPipelineTemplate,
  PipelinesPipelineTemplateRequestBody,
  PipelinesPostResponse,
  PipelinesQosFunction,
  PipelinesQosTier,
  PipelinesRequestOptions,
  PipelinesUpdateInstanceQuery,
  PipelinesUpdateInstanceResponse,
  PipelinesUpdateMigrationInstanceQuery,
  PipelinesUpdatePipelineQosConfigurationRequest,
} from "./types.js";

const PIPELINES_BASE_PATH = "/api/v2/pipelines";
const EVENT_STREAM_ACCEPT = "text/event-stream";

export function pipelinesBasePath(): string {
  return PIPELINES_BASE_PATH;
}

export function createPipelinesClient(
  transport: RestTransport,
): PipelinesClient {
  return new DefaultPipelinesClient(transport);
}

/** Fluent client for the RDP v2 Pipelines REST API. */
export interface PipelinesClient {
  readonly canvasCatalog: PipelinesCanvasCatalog;
  readonly instances: PipelinesInstances;
  readonly events: PipelinesEvents;
  readonly templates: PipelinesTemplates;
  readonly migration: PipelinesMigration;
  readonly qos: PipelinesQos;
}

class DefaultPipelinesClient implements PipelinesClient {
  readonly canvasCatalog: PipelinesCanvasCatalog;
  readonly instances: PipelinesInstances;
  readonly events: PipelinesEvents;
  readonly templates: PipelinesTemplates;
  readonly migration: PipelinesMigration;
  readonly qos: PipelinesQos;

  constructor(private readonly transport: RestTransport) {
    this.canvasCatalog = new PipelinesCanvasCatalog(transport);
    this.instances = new PipelinesInstances(transport);
    this.events = new PipelinesEvents(transport);
    this.templates = new PipelinesTemplates(transport);
    this.migration = new PipelinesMigration(transport);
    this.qos = new PipelinesQos(transport);
  }
}

export class PipelinesCanvasCatalog {
  constructor(private readonly transport: RestTransport) {}

  get(
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineCanvasCatalog> {
    return this.transport.request("GET", "/canvas/catalog", options);
  }
}

export class PipelinesInstances {
  constructor(private readonly transport: RestTransport) {}

  create(
    pipeline: PipelinesPipeline,
    query?: PipelinesCreateInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesCreateInstanceResponse> {
    return this.transport.request("POST", "/instance/create", {
      query,
      body: pipeline,
      ...options,
    });
  }

  importBundle(
    request: PipelinesPipelineImportRequest,
    query?: PipelinesImportInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesImportInstanceResponse> {
    return this.transport.request("POST", "/instance/import", {
      query,
      body: request,
      ...options,
    });
  }

  list(
    query?: PipelinesListInstancesQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineInstance[]> {
    return this.transport.request("GET", "/instance/all", {
      query,
      ...options,
      queryArrayFormat: "comma",
    });
  }

  get(
    uid: string,
    query?: PipelinesGetInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineInstance> {
    return this.transport.request("GET", `/instance/${segment(uid, "uid")}`, {
      query,
      ...options,
    });
  }

  update(
    uid: string,
    pipeline: PipelinesPipeline,
    query?: PipelinesUpdateInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesUpdateInstanceResponse> {
    return this.transport.request("PUT", `/instance/${segment(uid, "uid")}`, {
      query,
      body: pipeline,
      ...options,
    });
  }

  patch(
    uid: string,
    patch: PipelinesPipelinePatch,
    query?: PipelinesPatchInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPatchInstanceResponse> {
    return this.transport.request("PATCH", `/instance/${segment(uid, "uid")}`, {
      query,
      body: patch,
      ...options,
    });
  }

  delete(uid: string, options?: PipelinesRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/instance/${segment(uid, "uid")}`,
      options,
    );
  }

  exportBundle(
    uid: string,
    request?: PipelinesPipelineExportRequest,
    query?: PipelinesExportInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineExportBundle> {
    return this.transport.request(
      "POST",
      `/instance/${segment(uid, "uid")}/export`,
      {
        query,
        body: request,
        ...options,
      },
    );
  }

  start(uid: string, options?: PipelinesRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "POST",
      `/instance/${segment(uid, "uid")}/start`,
      options,
    );
  }

  stop(uid: string, options?: PipelinesRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "POST",
      `/instance/${segment(uid, "uid")}/stop`,
      options,
    );
  }

  restart(uid: string, options?: PipelinesRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "POST",
      `/instance/${segment(uid, "uid")}/restart`,
      options,
    );
  }

  status(
    uid: string,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesDetailedPipelineStatus> {
    return this.transport.request(
      "GET",
      `/instance/${segment(uid, "uid")}/status`,
      options,
    );
  }

  updateLayout(
    uid: string,
    layout: PipelinesPipelineLayoutUpdate,
    options?: PipelinesRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PUT",
      `/instance/${segment(uid, "uid")}/layout`,
      { body: layout, ...options },
    );
  }

  accessControls(
    uid: string,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesAccess[]> {
    return this.transport.request(
      "GET",
      `/instance/${segment(uid, "uid")}/access-controls`,
      options,
    );
  }

  updateAccessControls(
    uid: string,
    request: PipelinesBatchAccessControlRequest,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesBatchAccessControlResponse> {
    return this.transport.request(
      "POST",
      `/instance/${segment(uid, "uid")}/access-controls`,
      { body: request, ...options },
    );
  }

  deleteAccessControl(
    uid: string,
    entity: string,
    options?: PipelinesRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/instance/${segment(uid, "uid")}/access-controls/${segment(entity, "entity")}`,
      options,
    );
  }
}

export class PipelinesEvents {
  constructor(private readonly transport: RestTransport) {}

  all(
    query?: PipelinesEventsQuery,
    options?: PipelinesRequestOptions,
  ): Promise<Response> {
    const { accept = EVENT_STREAM_ACCEPT, ...rest } = options ?? {};
    return this.transport.requestRaw("GET", "/instance/events/all", {
      query,
      ...rest,
      accept,
    });
  }

  pipeline(
    pipelineUid: string,
    query?: PipelinesPipelineEventsQuery,
    options?: PipelinesRequestOptions,
  ): Promise<Response> {
    const { accept = EVENT_STREAM_ACCEPT, ...rest } = options ?? {};
    return this.transport.requestRaw(
      "GET",
      `/instance/events/${segment(pipelineUid, "pipelineUid")}`,
      {
        query,
        ...rest,
        accept,
      },
    );
  }

  transformerLogs(
    pipelineUid: string,
    transformerInstanceUid: string,
    options?: PipelinesRequestOptions,
  ): Promise<Response> {
    const { accept = EVENT_STREAM_ACCEPT, ...rest } = options ?? {};
    return this.transport.requestRaw(
      "GET",
      `/instance/${segment(pipelineUid, "pipelineUid")}/transformer/${segment(transformerInstanceUid, "transformerInstanceUid")}/logs`,
      {
        ...rest,
        accept,
      },
    );
  }
}

export class PipelinesTemplates {
  constructor(private readonly transport: RestTransport) {}

  create(
    template: PipelinesPipelineTemplateRequestBody,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPostResponse> {
    return this.transport.request("POST", "/template/create", {
      body: template,
      ...options,
    });
  }

  get(
    uid: string,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineTemplate> {
    return this.transport.request(
      "GET",
      `/template/${segment(uid, "uid")}`,
      options,
    );
  }

  update(
    uid: string,
    template: PipelinesPipelineTemplateRequestBody,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPostResponse> {
    return this.transport.request("PUT", `/template/${segment(uid, "uid")}`, {
      body: template,
      ...options,
    });
  }

  delete(uid: string, options?: PipelinesRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/template/${segment(uid, "uid")}`,
      options,
    );
  }

  list(
    query?: PipelinesListTemplatesQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineTemplate[]> {
    return this.transport.request("GET", "/template/all", {
      query,
      ...options,
      queryArrayFormat: "comma",
    });
  }

  accessControls(
    uid: string,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesAccess[]> {
    return this.transport.request(
      "GET",
      `/template/${segment(uid, "uid")}/access-controls`,
      options,
    );
  }

  updateAccessControls(
    uid: string,
    request: PipelinesBatchAccessControlRequest,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesBatchAccessControlResponse> {
    return this.transport.request(
      "POST",
      `/template/${segment(uid, "uid")}/access-controls`,
      { body: request, ...options },
    );
  }

  deleteAccessControl(
    uid: string,
    entity: string,
    options?: PipelinesRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/template/${segment(uid, "uid")}/access-controls/${segment(entity, "entity")}`,
      options,
    );
  }

  apply(
    uid: string,
    request: PipelinesInstantiateTemplateRequest,
    query?: PipelinesApplyTemplateQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesApplyTemplateResponse> {
    return this.transport.request(
      "POST",
      `/template/${segment(uid, "uid")}/apply`,
      {
        query,
        body: request,
        ...options,
      },
    );
  }
}

export class PipelinesMigration {
  constructor(private readonly transport: RestTransport) {}

  migrateAll(
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesMigrationResult> {
    return this.transport.request("POST", "/migration/migrate/all", options);
  }

  migrate(
    uid: string,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPostResponse> {
    return this.transport.request(
      "POST",
      `/migration/migrate/${segment(uid, "uid")}`,
      options,
    );
  }

  createInstance(
    pipeline: PipelinesPipeline,
    query?: PipelinesCreateMigrationInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPostResponse> {
    return this.transport.request("POST", "/migration/instance/create", {
      query,
      body: pipeline,
      ...options,
    });
  }

  listInstances(
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineInstance[]> {
    return this.transport.request("GET", "/migration/instance/all", options);
  }

  getInstance(
    uid: string,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineInstance> {
    return this.transport.request(
      "GET",
      `/migration/instance/${segment(uid, "uid")}`,
      options,
    );
  }

  updateInstance(
    uid: string,
    pipeline: PipelinesPipeline,
    query?: PipelinesUpdateMigrationInstanceQuery,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPostResponse> {
    return this.transport.request(
      "PUT",
      `/migration/instance/${segment(uid, "uid")}`,
      {
        query,
        body: pipeline,
        ...options,
      },
    );
  }

  deleteInstance(
    uid: string,
    options?: PipelinesRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/migration/instance/${segment(uid, "uid")}`,
      options,
    );
  }
}

export class PipelinesQos {
  constructor(private readonly transport: RestTransport) {}

  listConfigurations(
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineQosConfiguration[]> {
    return this.transport.request("GET", "/qos/configurations", options);
  }

  createConfiguration(
    request: PipelinesCreatePipelineQosConfigurationRequest,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesIdResponse> {
    return this.transport.request("POST", "/qos/configurations", {
      body: request,
      ...options,
    });
  }

  getConfiguration(
    qosFunction: PipelinesQosFunction,
    tier: PipelinesQosTier,
    options?: PipelinesRequestOptions,
  ): Promise<PipelinesPipelineQosConfiguration> {
    return this.transport.request(
      "GET",
      qosConfigurationPath(qosFunction, tier),
      options,
    );
  }

  updateConfiguration(
    qosFunction: PipelinesQosFunction,
    tier: PipelinesQosTier,
    request: PipelinesUpdatePipelineQosConfigurationRequest,
    options?: PipelinesRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PUT",
      qosConfigurationPath(qosFunction, tier),
      { body: request, ...options },
    );
  }

  deleteConfiguration(
    qosFunction: PipelinesQosFunction,
    tier: PipelinesQosTier,
    options?: PipelinesRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      qosConfigurationPath(qosFunction, tier),
      options,
    );
  }
}

function qosConfigurationPath(
  qosFunction: PipelinesQosFunction,
  tier: PipelinesQosTier,
): string {
  return `/qos/configuration/${segment(qosFunction, "function")}/${segment(tier, "tier")}`;
}

function segment(value: string, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`rdp: ${name} is required`);
  }
  return encodePath(value);
}
