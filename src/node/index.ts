// Core exports (platform-agnostic)
export {
  DEFAULT_SERVER_URL,
  type Logger,
  type Option,
  VERSION,
  type RdpConfig,
  WithAPIKey,
  WithBearerToken,
  WithClientCredentials,
  WithLogger,
  WithTimeout,
  fromConfig,
} from "../internal/index.js";
export type {
  AccessControls,
  AddDocumentRequest,
  AllDatasetsCountQuery,
  AllDatasetsQuery,
  CatalogClient,
  CatalogOperation,
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
  DatasourceDatasetCountQuery,
  DatasourceDatasetQuery,
  DatasetCountQuery,
  DatasetDocument,
  DatasetFilterQuery,
  DatasetIngestionStatusQuery,
  DatasetMetadata,
  DatasetQuery,
  DatasetSchemaContentType,
  DatasetSchemaQuery,
  DatasetSchemaResponse,
  DatasetSchemaUpdateOptions,
  DeleteAllDatasetsQuery,
  DeleteAllEnablementsQuery,
  DeleteAllStoragesQuery,
  FilterValidationResponse,
  GlobalSearchQuery,
  GlobalSearchRequest,
  GlobalSearchResponse,
  Ingestion,
  JsonPatchOperation,
  OperationJsonRequest,
  OperationJsonResponse,
  OperationQuery,
  Pipeline,
  SchemaHints,
  SchemaInfoWithHints,
  StorageCountQuery,
  StorageQuery,
  UpdateDatasetSchemaResponse,
} from "../catalog/index.js";
export type * from "../pipelines/index.js";
export type * from "../transformers/index.js";

// Node platform helpers
export { createLogger } from "../internal/node/logging.js";
export {
  type NodeOption,
  WithTLSSkipVerify,
} from "../internal/node/options.js";

// WDM v1 canonical node facade
export {
  type ActionServiceClient,
  createClient,
  type ObjectServiceClient,
  type RdpV1Client,
} from "./client.js";
export { fromNodeConfig, loadConfig } from "./config.js";
