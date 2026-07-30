import type { components, operations } from "./openapi.js";

export type CatalogOperation = keyof operations;

type OperationParameters<Operation extends CatalogOperation> =
  operations[Operation] extends { parameters: infer Parameters }
    ? Parameters
    : never;

type OperationRequestBody<Operation extends CatalogOperation> =
  operations[Operation] extends { requestBody: infer RequestBody }
    ? RequestBody
    : operations[Operation] extends { requestBody?: infer RequestBody }
      ? RequestBody
      : never;

type JsonResponseForStatus<
  Operation extends CatalogOperation,
  Status extends number,
> = Status extends keyof operations[Operation]["responses"]
  ? operations[Operation]["responses"][Status] extends {
      content: { "application/json": infer ResponseBody };
    }
    ? ResponseBody
    : never
  : never;

type ProtobufSchemaResponseForStatus<
  Operation extends CatalogOperation,
  Status extends number,
> = Status extends keyof operations[Operation]["responses"]
  ? operations[Operation]["responses"][Status] extends {
      content: { "application/x-protobuf-schema": infer ResponseBody };
    }
    ? ResponseBody
    : never
  : never;

export type OperationQuery<Operation extends CatalogOperation> =
  OperationParameters<Operation> extends { query: infer Query }
    ? Query
    : OperationParameters<Operation> extends { query?: infer Query }
      ? Query
      : never;

export type OperationJsonRequest<Operation extends CatalogOperation> =
  NonNullable<OperationRequestBody<Operation>> extends {
    content: { "application/json": infer RequestBody };
  }
    ? RequestBody
    : never;

export type OperationJsonResponse<Operation extends CatalogOperation> =
  | JsonResponseForStatus<Operation, 200>
  | JsonResponseForStatus<Operation, 201>
  | JsonResponseForStatus<Operation, 202>;

export type DataSource = components["schemas"]["DataSource"];
export type DataSourceDocument = components["schemas"]["DataSourceDocument"];
export type DataSourceEnablement =
  components["schemas"]["DataSourceEnablement"];
export type DataSourceEnablementRequest =
  components["schemas"]["DataSourceEnablementRequest"];
export type DataSet = components["schemas"]["DataSet"];
export type DataSetStorage = components["schemas"]["DataSetStorage"];
export type DataSourcePatch = Partial<DataSource>;
export type DataSourceEnablementPatch = Partial<DataSourceEnablement>;
export type DataSetPatch = Partial<DataSet>;
export type DataSetStoragePatch = Partial<DataSetStorage>;
export type DatasetDocument = components["schemas"]["DatasetDocument"];
export type AddDocumentRequest = components["schemas"]["AddDocumentRequest"];
export type Ingestion = components["schemas"]["Ingestion"];
export type Pipeline = components["schemas"]["Pipeline"];
export type SchemaInfoWithHints = components["schemas"]["SchemaInfoWithHints"];
export type SchemaHints = components["schemas"]["SchemaHints"];
export type AccessControls = components["schemas"]["AccessControls"];
export type CreateFilteredDatasetRequest =
  components["schemas"]["CreateFilteredDatasetRequest"];
export type CreateFilteredDatasetResponse =
  components["schemas"]["CreateFilteredDatasetResponse"];
export type FilterValidationResponse =
  components["schemas"]["FilterValidationResponse"];
export type GlobalSearchRequest = components["schemas"]["GlobalSearchRequest"];
export type GlobalSearchResponse = OperationJsonResponse<"postGlobalSearch">;
export type UpdateDatasetSchemaResponse =
  components["schemas"]["UpdateDatasetSchema200Response"];
export type DatasetMetadata = Record<string, string>;
export type DatasetSchemaResponse =
  | SchemaInfoWithHints
  | ProtobufSchemaResponseForStatus<"getDatasetSchemaById", 200>;

export type DataSourceQuery = OperationQuery<"getDatasources">;
export type DataSourceCountQuery = OperationQuery<"countDatasources">;
export type DataSourceEnablementQuery = OperationQuery<"getAllEnablements">;
export type DataSourceEnablementCountQuery =
  OperationQuery<"countAllEnablements">;
export type DataSourceScopedEnablementQuery =
  OperationQuery<"getAllDatasourceEnablements">;
export type DataSourceScopedEnablementCountQuery =
  OperationQuery<"countAllDatasourceEnablements">;
export type DatasetQuery = OperationQuery<"getAllDatasetsTopLevel">;
export type DatasetCountQuery = OperationQuery<"countAllDatasetsTopLevel">;
export type DatasourceDatasetQuery =
  OperationQuery<"getAllDatasetsForDatasource">;
export type DatasourceDatasetCountQuery =
  OperationQuery<"countAllDatasetsForDatasource">;
export type AllDatasetsQuery = OperationQuery<"getAllDatasets">;
export type AllDatasetsCountQuery = OperationQuery<"countAllDatasets">;
export type DatasetSchemaQuery = OperationQuery<"getDatasetSchemaById">;
export type DatasetFilterQuery =
  OperationQuery<"createDatasetFilterByDatasetId">;
export type DatasetIngestionStatusQuery =
  OperationQuery<"getAllDatasetIngestionStatusesForDatasource">;
export type StorageQuery = OperationQuery<"getAllStorages">;
export type StorageCountQuery = OperationQuery<"countAllStorages">;
export type DeleteAllEnablementsQuery = OperationQuery<"deleteAllEnablements">;
export type DeleteAllDatasetsQuery = OperationQuery<"deleteAllDatasets">;
export type DeleteAllStoragesQuery = OperationQuery<"deleteAllStorages">;
export type GlobalSearchQuery = OperationQuery<"postGlobalSearch">;

export interface JsonPatchOperation {
  op: string;
  path: string;
  from?: string;
  value?: unknown;
  [key: string]: unknown;
}

export type DatasetSchemaContentType =
  | "application/json"
  | "application/x-protobuf-schema";

export interface CatalogRequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  accept?: string;
}

export interface DatasetSchemaUpdateOptions extends CatalogRequestOptions {
  contentType?: DatasetSchemaContentType;
}
