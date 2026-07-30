import {
  type RestRequestOptions,
  type RestTransport,
  encodePath,
} from "../internal/rest.js";
import type {
  AccessControls,
  AddDocumentRequest,
  AllDatasetsCountQuery,
  AllDatasetsQuery,
  CatalogRequestOptions,
  CreateFilteredDatasetRequest,
  CreateFilteredDatasetResponse,
  DataSet,
  DataSetPatch,
  DataSetStorage,
  DataSetStoragePatch,
  DataSource,
  DataSourceCountQuery,
  DataSourceDocument,
  DataSourceEnablement,
  DataSourceEnablementCountQuery,
  DataSourceEnablementPatch,
  DataSourceEnablementQuery,
  DataSourceEnablementRequest,
  DataSourcePatch,
  DataSourceQuery,
  DataSourceScopedEnablementCountQuery,
  DataSourceScopedEnablementQuery,
  DatasetCountQuery,
  DatasetDocument,
  DatasetFilterQuery,
  DatasetIngestionStatusQuery,
  DatasetMetadata,
  DatasetQuery,
  DatasetSchemaQuery,
  DatasetSchemaResponse,
  DatasetSchemaUpdateOptions,
  DatasourceDatasetCountQuery,
  DatasourceDatasetQuery,
  DeleteAllDatasetsQuery,
  DeleteAllEnablementsQuery,
  DeleteAllStoragesQuery,
  FilterValidationResponse,
  GlobalSearchQuery,
  GlobalSearchRequest,
  GlobalSearchResponse,
  Ingestion,
  JsonPatchOperation,
  OperationJsonResponse,
  Pipeline,
  SchemaHints,
  StorageCountQuery,
  StorageQuery,
  UpdateDatasetSchemaResponse,
} from "./types.js";

const CATALOG_BASE_PATH = "/api/v2/catalog";
const DATASET_SCHEMA_ACCEPT = "application/json, application/x-protobuf-schema";

export function catalogBasePath(): string {
  return CATALOG_BASE_PATH;
}

export function createCatalogClient(transport: RestTransport): CatalogClient {
  return new DefaultCatalogClient(transport);
}

/** Fluent client for the RDP v2 Catalog REST API. */
export interface CatalogClient {
  readonly dataSources: CatalogDataSources;
  readonly enablements: CatalogEnablements;
  readonly datasets: CatalogDatasets;
  readonly storages: CatalogStorages;
  readonly search: CatalogSearch;
}

class DefaultCatalogClient implements CatalogClient {
  readonly dataSources: CatalogDataSources;
  readonly enablements: CatalogEnablements;
  readonly datasets: CatalogDatasets;
  readonly storages: CatalogStorages;
  readonly search: CatalogSearch;

  constructor(private readonly transport: RestTransport) {
    this.dataSources = new CatalogDataSources(transport);
    this.enablements = new CatalogEnablements(transport);
    this.datasets = new CatalogDatasets(transport);
    this.storages = new CatalogStorages(transport);
    this.search = new CatalogSearch(transport);
  }
}

export class CatalogDataSources {
  constructor(private readonly transport: RestTransport) {}

  list(
    query?: DataSourceQuery,
    options?: CatalogRequestOptions,
  ): Promise<DataSource[]> {
    return this.transport.request("GET", "/datasources", {
      query,
      ...options,
    });
  }

  count(
    query?: DataSourceCountQuery,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count("/datasources", { query, ...options });
  }

  create(
    dataSource: DataSource,
    options?: CatalogRequestOptions,
  ): Promise<DataSource> {
    return this.transport.request("POST", "/datasources", {
      body: dataSource,
      ...options,
    });
  }

  get(
    dataSourceId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSource> {
    return this.transport.request(
      "GET",
      `/datasources/${segment(dataSourceId)}`,
      options,
    );
  }

  update(
    dataSourceId: string,
    dataSource: DataSource,
    options?: CatalogRequestOptions,
  ): Promise<DataSource | undefined> {
    return this.transport.request(
      "PUT",
      `/datasources/${segment(dataSourceId)}`,
      {
        body: dataSource,
        ...options,
      },
    );
  }

  patch(
    dataSourceId: string,
    dataSource: DataSourcePatch,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PATCH",
      `/datasources/${segment(dataSourceId)}`,
      {
        body: dataSource,
        ...options,
      },
    );
  }

  delete(
    dataSourceId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSource> {
    return this.transport.request(
      "DELETE",
      `/datasources/${segment(dataSourceId)}`,
      options,
    );
  }

  addLabels(
    dataSourceId: string,
    labels: string[],
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "POST",
      `/datasources/${segment(dataSourceId)}/labels`,
      {
        body: labels,
        ...options,
      },
    );
  }

  labels(
    dataSourceId: string,
    options?: CatalogRequestOptions,
  ): Promise<string[]> {
    return this.transport.request(
      "GET",
      `/datasources/${segment(dataSourceId)}/labels`,
      options,
    );
  }

  countLabels(
    dataSourceId: string,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count(
      `/datasources/${segment(dataSourceId)}/labels`,
      options,
    );
  }

  updateLabels(
    dataSourceId: string,
    labels: string[],
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PUT",
      `/datasources/${segment(dataSourceId)}/labels`,
      {
        body: labels,
        ...options,
      },
    );
  }

  deleteLabels(
    dataSourceId: string,
    labels: string[],
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasources/${segment(dataSourceId)}/labels`,
      {
        body: labels,
        ...options,
      },
    );
  }

  addDocument(
    dataSourceId: string,
    document: AddDocumentRequest,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceDocument> {
    return this.transport.request(
      "POST",
      `/datasources/${segment(dataSourceId)}/documents`,
      {
        body: document,
        ...options,
      },
    );
  }

  documents(
    dataSourceId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceDocument[]> {
    return this.transport.request(
      "GET",
      `/datasources/${segment(dataSourceId)}/documents`,
      options,
    );
  }

  document(
    dataSourceId: string,
    documentId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceDocument> {
    return this.transport.request(
      "GET",
      `/datasources/${segment(dataSourceId)}/documents/${segment(documentId)}`,
      options,
    );
  }

  deleteDocument(
    dataSourceId: string,
    documentId: string,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasources/${segment(dataSourceId)}/documents/${segment(documentId)}`,
      options,
    );
  }

  allEnablements(
    query?: DataSourceScopedEnablementQuery,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceEnablement[]> {
    return this.transport.request("GET", "/datasources/all/enablements", {
      query,
      ...options,
    });
  }

  countAllEnablements(
    query?: DataSourceScopedEnablementCountQuery,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count("/datasources/all/enablements", {
      query,
      ...options,
    });
  }

  datasets(
    dataSourceId: string,
    query?: DatasourceDatasetQuery,
    options?: CatalogRequestOptions,
  ): Promise<DataSet[]> {
    return this.transport.request(
      "GET",
      `/datasources/${segment(dataSourceId)}/enablements/all/datasets`,
      { query, ...options },
    );
  }

  countDatasets(
    dataSourceId: string,
    query?: DatasourceDatasetCountQuery,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count(
      `/datasources/${segment(dataSourceId)}/enablements/all/datasets`,
      { query, ...options },
    );
  }

  allDatasets(
    query?: AllDatasetsQuery,
    options?: CatalogRequestOptions,
  ): Promise<DataSet[]> {
    return this.transport.request(
      "GET",
      "/datasources/all/enablements/all/datasets",
      {
        query,
        ...options,
      },
    );
  }

  countAllDatasets(
    query?: AllDatasetsCountQuery,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count("/datasources/all/enablements/all/datasets", {
      query,
      ...options,
    });
  }
}

export class CatalogEnablements {
  constructor(private readonly transport: RestTransport) {}

  list(
    query?: DataSourceEnablementQuery,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceEnablement[]> {
    return this.transport.request("GET", "/enablements", { query, ...options });
  }

  count(
    query?: DataSourceEnablementCountQuery,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count("/enablements", { query, ...options });
  }

  create(
    enablement: DataSourceEnablementRequest,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid("POST", "/enablements", {
      body: enablement,
      ...options,
    });
  }

  deleteAll(
    query: DeleteAllEnablementsQuery,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid("DELETE", "/enablements", {
      query,
      ...options,
    });
  }

  get(
    enablementId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceEnablement> {
    return this.transport.request(
      "GET",
      `/enablements/${segment(enablementId)}`,
      options,
    );
  }

  update(
    enablementId: string,
    enablement: DataSourceEnablement,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceEnablement> {
    return this.transport.request(
      "PUT",
      `/enablements/${segment(enablementId)}`,
      {
        body: enablement,
        ...options,
      },
    );
  }

  patch(
    enablementId: string,
    enablement: DataSourceEnablementPatch,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PATCH",
      `/enablements/${segment(enablementId)}`,
      {
        body: enablement,
        ...options,
      },
    );
  }

  delete(
    enablementId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSourceEnablement> {
    return this.transport.request(
      "DELETE",
      `/enablements/${segment(enablementId)}`,
      options,
    );
  }
}

export class CatalogDatasets {
  constructor(private readonly transport: RestTransport) {}

  list(
    query?: DatasetQuery,
    options?: CatalogRequestOptions,
  ): Promise<DataSet[]> {
    return this.transport.request("GET", "/datasets", { query, ...options });
  }

  count(
    query?: DatasetCountQuery,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count("/datasets", { query, ...options });
  }

  create(dataset: DataSet, options?: CatalogRequestOptions): Promise<void> {
    return this.transport.requestVoid("POST", "/datasets", {
      body: dataset,
      ...options,
    });
  }

  deleteAll(
    query: DeleteAllDatasetsQuery,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid("DELETE", "/datasets", {
      query,
      ...options,
    });
  }

  get(datasetId: string, options?: CatalogRequestOptions): Promise<DataSet> {
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}`,
      options,
    );
  }

  update(
    datasetId: string,
    dataset: DataSet,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PUT",
      `/datasets/${segment(datasetId)}`,
      {
        body: dataset,
        ...options,
      },
    );
  }

  patch(
    datasetId: string,
    dataset: DataSetPatch,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PATCH",
      `/datasets/${segment(datasetId)}`,
      {
        body: dataset,
        ...options,
      },
    );
  }

  delete(datasetId: string, options?: CatalogRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasets/${segment(datasetId)}`,
      options,
    );
  }

  addLabels(
    datasetId: string,
    labels: string[],
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "POST",
      `/datasets/${segment(datasetId)}/labels`,
      {
        body: labels,
        ...options,
      },
    );
  }

  labels(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<string[]> {
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}/labels`,
      options,
    );
  }

  countLabels(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count(
      `/datasets/${segment(datasetId)}/labels`,
      options,
    );
  }

  updateLabels(
    datasetId: string,
    labels: string[],
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PUT",
      `/datasets/${segment(datasetId)}/labels`,
      {
        body: labels,
        ...options,
      },
    );
  }

  deleteLabels(
    datasetId: string,
    labels: string[],
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasets/${segment(datasetId)}/labels`,
      {
        body: labels,
        ...options,
      },
    );
  }

  startIngestion(
    datasetId: string,
    ingestion?: Ingestion,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "POST",
      `/datasets/${segment(datasetId)}/ingestion`,
      {
        body: ingestion,
        ...options,
      },
    );
  }

  stopIngestion(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasets/${segment(datasetId)}/ingestion`,
      options,
    );
  }

  ingestionStatus(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<Ingestion> {
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}/ingestion`,
      options,
    );
  }

  patchIngestion(
    datasetId: string,
    ingestion: Ingestion,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PATCH",
      `/datasets/${segment(datasetId)}/ingestion`,
      {
        body: ingestion,
        ...options,
      },
    );
  }

  schema(
    datasetId: string,
    query?: DatasetSchemaQuery,
    options?: CatalogRequestOptions,
  ): Promise<DatasetSchemaResponse> {
    const { accept = DATASET_SCHEMA_ACCEPT, ...rest } = options ?? {};
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}/schema`,
      {
        query,
        ...rest,
        accept,
      },
    );
  }

  updateSchema(
    datasetId: string,
    schema: unknown,
    options: DatasetSchemaUpdateOptions = {},
  ): Promise<UpdateDatasetSchemaResponse> {
    const { contentType = "application/json", ...rest } = options;
    return this.transport.request(
      "PUT",
      `/datasets/${segment(datasetId)}/schema`,
      {
        body: schema,
        contentType,
        ...rest,
      },
    );
  }

  schemaHints(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<SchemaHints> {
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}/schema/hints`,
      options,
    );
  }

  updateSchemaHints(
    datasetId: string,
    hints: SchemaHints,
    options?: CatalogRequestOptions,
  ): Promise<SchemaHints> {
    return this.transport.request(
      "PUT",
      `/datasets/${segment(datasetId)}/schema/hints`,
      {
        body: hints,
        ...options,
      },
    );
  }

  patchSchemaHints(
    datasetId: string,
    patch: JsonPatchOperation[],
    options?: CatalogRequestOptions,
  ): Promise<SchemaHints> {
    return this.transport.request(
      "PATCH",
      `/datasets/${segment(datasetId)}/schema/hints`,
      {
        body: patch,
        contentType: "application/json-patch+json",
        ...options,
      },
    );
  }

  deleteSchemaHints(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasets/${segment(datasetId)}/schema/hints`,
      options,
    );
  }

  accessControls(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<AccessControls> {
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}/access-controls`,
      options,
    );
  }

  replaceAccessControls(
    datasetId: string,
    accessControls: AccessControls,
    options?: CatalogRequestOptions,
  ): Promise<AccessControls> {
    return this.transport.request(
      "PUT",
      `/datasets/${segment(datasetId)}/access-controls`,
      {
        body: accessControls,
        ...options,
      },
    );
  }

  patchAccessControls(
    datasetId: string,
    patch: JsonPatchOperation[],
    options?: CatalogRequestOptions,
  ): Promise<AccessControls> {
    return this.transport.request(
      "PATCH",
      `/datasets/${segment(datasetId)}/access-controls`,
      {
        body: patch,
        contentType: "application/json-patch+json",
        ...options,
      },
    );
  }

  deleteAccessControls(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasets/${segment(datasetId)}/access-controls`,
      options,
    );
  }

  deleteAccessControl(
    datasetId: string,
    accessControlId: string,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/datasets/${segment(datasetId)}/access-controls/${segment(accessControlId)}`,
      options,
    );
  }

  derived(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSet[]> {
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}/filters`,
      options,
    );
  }

  createFilter(
    datasetId: string,
    request: CreateFilteredDatasetRequest,
    query?: DatasetFilterQuery,
    options?: CatalogRequestOptions,
  ): Promise<CreateFilteredDatasetResponse | FilterValidationResponse> {
    return this.transport.request(
      "POST",
      `/datasets/${segment(datasetId)}/filters`,
      {
        query,
        body: request,
        ...options,
      },
    );
  }

  pipelines(
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<Pipeline[]> {
    return this.transport.request(
      "GET",
      `/datasets/${segment(datasetId)}/pipelines`,
      options,
    );
  }

  metadata(
    dataSourceId: string,
    enablementId: string,
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<DatasetMetadata> {
    return this.transport.request(
      "GET",
      nestedDatasetPath(dataSourceId, enablementId, datasetId, "metadata"),
      options,
    );
  }

  updateMetadata(
    dataSourceId: string,
    enablementId: string,
    datasetId: string,
    metadata: DatasetMetadata,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PUT",
      nestedDatasetPath(dataSourceId, enablementId, datasetId, "metadata"),
      { body: metadata, ...options },
    );
  }

  addDocument(
    dataSourceId: string,
    enablementId: string,
    datasetId: string,
    document: AddDocumentRequest,
    options?: CatalogRequestOptions,
  ): Promise<DatasetDocument> {
    return this.transport.request(
      "POST",
      nestedDatasetPath(dataSourceId, enablementId, datasetId, "documents"),
      { body: document, ...options },
    );
  }

  documents(
    dataSourceId: string,
    enablementId: string,
    datasetId: string,
    options?: CatalogRequestOptions,
  ): Promise<DatasetDocument[]> {
    return this.transport.request(
      "GET",
      nestedDatasetPath(dataSourceId, enablementId, datasetId, "documents"),
      options,
    );
  }

  document(
    dataSourceId: string,
    enablementId: string,
    datasetId: string,
    documentId: string,
    options?: CatalogRequestOptions,
  ): Promise<DatasetDocument> {
    return this.transport.request(
      "GET",
      `${nestedDatasetPath(dataSourceId, enablementId, datasetId, "documents")}/${segment(documentId)}`,
      options,
    );
  }

  deleteDocument(
    dataSourceId: string,
    enablementId: string,
    datasetId: string,
    documentId: string,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `${nestedDatasetPath(dataSourceId, enablementId, datasetId, "documents")}/${segment(documentId)}`,
      options,
    );
  }

  ingestionStatuses(
    dataSourceId: string,
    enablementId: string,
    options?: CatalogRequestOptions,
  ): Promise<OperationJsonResponse<"getAllDatasetIngestionStatuses">> {
    return this.transport.request(
      "GET",
      `/datasources/${segment(dataSourceId)}/enablements/${segment(enablementId)}/datasets/all/ingestion`,
      options,
    );
  }

  ingestionStatusesForDataSource(
    dataSourceId: string,
    query?: DatasetIngestionStatusQuery,
    options?: CatalogRequestOptions,
  ): Promise<
    OperationJsonResponse<"getAllDatasetIngestionStatusesForDatasource">
  > {
    return this.transport.request(
      "GET",
      `/datasources/${segment(dataSourceId)}/enablements/all/datasets/all/ingestion`,
      { query, ...options },
    );
  }
}

export class CatalogStorages {
  constructor(private readonly transport: RestTransport) {}

  list(
    query?: StorageQuery,
    options?: CatalogRequestOptions,
  ): Promise<DataSetStorage[]> {
    return this.transport.request("GET", "/storages", { query, ...options });
  }

  count(
    query?: StorageCountQuery,
    options?: CatalogRequestOptions,
  ): Promise<number> {
    return this.transport.count("/storages", { query, ...options });
  }

  create(
    storage: DataSetStorage,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid("POST", "/storages", {
      body: storage,
      ...options,
    });
  }

  deleteAll(
    query: DeleteAllStoragesQuery,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid("DELETE", "/storages", {
      query,
      ...options,
    });
  }

  get(
    storageId: string,
    options?: CatalogRequestOptions,
  ): Promise<DataSetStorage> {
    return this.transport.request(
      "GET",
      `/storages/${segment(storageId)}`,
      options,
    );
  }

  delete(storageId: string, options?: CatalogRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/storages/${segment(storageId)}`,
      options,
    );
  }

  update(
    storageId: string,
    storage: DataSetStorage,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PUT",
      `/storages/${segment(storageId)}`,
      {
        body: storage,
        ...options,
      },
    );
  }

  patch(
    storageId: string,
    storage: DataSetStoragePatch,
    options?: CatalogRequestOptions,
  ): Promise<void> {
    return this.transport.requestVoid(
      "PATCH",
      `/storages/${segment(storageId)}`,
      {
        body: storage,
        ...options,
      },
    );
  }
}

export class CatalogSearch {
  constructor(private readonly transport: RestTransport) {}

  global(
    request: GlobalSearchRequest,
    query?: GlobalSearchQuery,
    options?: CatalogRequestOptions,
  ): Promise<GlobalSearchResponse | undefined> {
    return this.transport.request("POST", "/search", {
      query,
      body: request,
      ...options,
    });
  }
}

function segment(value: string): string {
  return encodePath(value);
}

function nestedDatasetPath(
  dataSourceId: string,
  enablementId: string,
  datasetId: string,
  suffix: string,
): string {
  return `/datasources/${segment(dataSourceId)}/enablements/${segment(enablementId)}/datasets/${segment(datasetId)}/${suffix}`;
}
