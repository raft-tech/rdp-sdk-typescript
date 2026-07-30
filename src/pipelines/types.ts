import type { components, operations } from "./openapi.js";

export type PipelinesOperation = keyof operations;

type OperationParameters<Operation extends PipelinesOperation> =
  operations[Operation] extends { parameters: infer Parameters }
    ? Parameters
    : never;

type OperationRequestBody<Operation extends PipelinesOperation> =
  operations[Operation] extends { requestBody: infer RequestBody }
    ? RequestBody
    : operations[Operation] extends { requestBody?: infer RequestBody }
      ? RequestBody
      : never;

type JsonResponseForStatus<
  Operation extends PipelinesOperation,
  Status extends number,
> = Status extends keyof operations[Operation]["responses"]
  ? operations[Operation]["responses"][Status] extends {
      content: { "application/json": infer ResponseBody };
    }
    ? ResponseBody
    : never
  : never;

export type PipelinesOperationQuery<Operation extends PipelinesOperation> =
  OperationParameters<Operation> extends { query: infer Query }
    ? Query
    : OperationParameters<Operation> extends { query?: infer Query }
      ? Query
      : never;

export type PipelinesOperationJsonRequest<
  Operation extends PipelinesOperation,
> = NonNullable<OperationRequestBody<Operation>> extends {
  content: { "application/json": infer RequestBody };
}
  ? RequestBody
  : never;

export type PipelinesOperationJsonResponse<
  Operation extends PipelinesOperation,
> =
  | JsonResponseForStatus<Operation, 200>
  | JsonResponseForStatus<Operation, 201>
  | JsonResponseForStatus<Operation, 202>;

export type PipelinesConnectionType = components["schemas"]["ConnectionType"];
export type PipelinesPipelineCanvasCatalog =
  components["schemas"]["PipelineCanvasCatalog"];
export type PipelinesPipelineCanvasCatalogCategory =
  components["schemas"]["PipelineCanvasCatalogCategory"];
export type PipelinesPipelineCanvasCatalogItem =
  components["schemas"]["PipelineCanvasCatalogItem"];
export type PipelinesPipelineCanvasCatalogDataset =
  components["schemas"]["PipelineCanvasCatalogDataset"];
export type PipelinesPipelineCanvasCatalogFederation =
  components["schemas"]["PipelineCanvasCatalogFederation"];
export type PipelinesPipelineCanvasCatalogFederationSource =
  components["schemas"]["PipelineCanvasCatalogFederationSource"];
export type PipelinesPipelineCanvasCatalogFacet =
  components["schemas"]["PipelineCanvasCatalogFacet"];
export type PipelinesPipelineCanvasCatalogFacetOption =
  components["schemas"]["PipelineCanvasCatalogFacetOption"];
export type PipelinesErrorMessage = components["schemas"]["ErrorMessage"];
export type PipelinesErrorResponse = components["schemas"]["ErrorResponse"];
export type PipelinesErrorDetail = components["schemas"]["ErrorDetail"];
export type PipelinesLabelRecord = components["schemas"]["LabelRecord"];
export type PipelinesPostResponse = components["schemas"]["PostResp"];
export type PipelinesPipelineExportMode =
  components["schemas"]["PipelineExportMode"];
export type PipelinesTransformerTemplateBundleItem =
  components["schemas"]["TransformerTemplateBundleItem"];
export type PipelinesPipelineExportBundle =
  components["schemas"]["PipelineExportBundle"];
export type PipelinesPipelineExportEnvironmentRedaction =
  components["schemas"]["PipelineExportEnvironmentRedaction"];
export type PipelinesPipelineExportRedaction =
  components["schemas"]["PipelineExportRedaction"];
export type PipelinesPipelineExportTransformerConfigSelection =
  components["schemas"]["PipelineExportTransformerConfigSelection"];
export type PipelinesPipelineExportRequest =
  components["schemas"]["PipelineExportRequest"];
export type PipelinesPipelineImportRequest =
  components["schemas"]["PipelineImportRequest"];
export type PipelinesMigrationResult = components["schemas"]["MigrationResult"];
export type PipelinesBatchAccessControlRequest =
  components["schemas"]["BatchAccessControlRequest"];
export type PipelinesBatchAccessControlResponse =
  components["schemas"]["BatchAccessControlResponse"];
export type PipelinesBatchAccessControlResult =
  components["schemas"]["BatchAccessControlResult"];
export type PipelinesPipelineInstance =
  components["schemas"]["PipelineInstance"];
export type PipelinesPipeline = components["schemas"]["Pipeline"];
export type PipelinesPosition = components["schemas"]["Position"];
export type PipelinesPipelineLayoutUpdate =
  components["schemas"]["PipelineLayoutUpdate"];
export type PipelinesPipelinePatch = components["schemas"]["PipelinePatch"];
export type PipelinesPipelinePatchAdd =
  components["schemas"]["PipelinePatchAdd"];
export type PipelinesPipelinePatchRemove =
  components["schemas"]["PipelinePatchRemove"];
export type PipelinesPipelinePatchUpdate =
  components["schemas"]["PipelinePatchUpdate"];
export type PipelinesDataConnection = components["schemas"]["DataConn"];
export type PipelinesDataConnectionTemplate =
  components["schemas"]["DataConnTpl"];
export type PipelinesWorkflowAcceptedType =
  components["schemas"]["WorkflowAcceptedType"];
export type PipelinesConfiguration = components["schemas"]["Configuration"];
export type PipelinesFileConfig = components["schemas"]["FileCfg"];
export type PipelinesAccess = components["schemas"]["Access"];
export type PipelinesTransformerInstance =
  components["schemas"]["TransformerInstance"];
export type PipelinesTransformerInstancePost =
  components["schemas"]["TransformerInstancePost"];
export type PipelinesTransformerTemplate =
  components["schemas"]["TransformerTemplate"];
export type PipelinesConfigurationTemplate =
  components["schemas"]["ConfigurationTpl"];
export type PipelinesEnvironmentTemplate =
  components["schemas"]["EnvironmentTpl"];
export type PipelinesPipelineTemplateRequestBody =
  components["schemas"]["PipelineTemplateRequestBody"];
export type PipelinesPipelineTemplate =
  components["schemas"]["PipelineTemplate"];
export type PipelinesPipelineTemplateDefinition =
  components["schemas"]["PipelineTemplateDefinition"];
export type PipelinesPipelineTemplateParameter =
  components["schemas"]["PipelineTemplateParameter"];
export type PipelinesInstantiateTemplateRequest =
  components["schemas"]["InstantiateTemplateRequest"];
export type PipelinesEnvironmentVariable = components["schemas"]["EnvVar"];
export type PipelinesFileConfigTemplate = components["schemas"]["FileCfgTpl"];
export type PipelinesCreationConfig = components["schemas"]["CreationConfig"];
export type PipelinesRdpWorkflow = components["schemas"]["RdpWorkflow"];
export type PipelinesImageConfig = components["schemas"]["ImageConfig"];
export type PipelinesDatasetRef = components["schemas"]["DatasetRef"];
export type PipelinesDatasetRefPost = components["schemas"]["DatasetRefPost"];
export type PipelinesNote = components["schemas"]["Note"];
export type PipelinesNotePost = components["schemas"]["NotePost"];
export type PipelinesAnnotationRecord =
  components["schemas"]["AnnotationRecord"];
export type PipelinesDatasetConfiguration =
  components["schemas"]["DatasetConfiguration"];
export type PipelinesDatasetCatalog = components["schemas"]["DatasetCatalog"];
export type PipelinesConnection = components["schemas"]["Connection"];
export type PipelinesConnectionEndpoint =
  components["schemas"]["ConnectionEndpoint"];
export type PipelinesDetailedPipelineStatus =
  components["schemas"]["DetailedPipelineStatus"];
export type PipelinesPipelineStatus = components["schemas"]["PipelineStatus"];
export type PipelinesStageStatusRef = components["schemas"]["StageStatusRef"];
export type PipelinesStageStatus = components["schemas"]["StageStatus"];
export type PipelinesArity = components["schemas"]["Arity"];
export type PipelinesPipelineCondition =
  components["schemas"]["PipelineCondition"];
export type PipelinesStageCondition = components["schemas"]["StageCondition"];
export type PipelinesProperty = components["schemas"]["Property"];
export type PipelinesQosFunction = components["schemas"]["QosFunction"];
export type PipelinesQosTier = components["schemas"]["QosTier"];
export type PipelinesPipelineQosConfiguration =
  components["schemas"]["PipelineQosConfiguration"];
export type PipelinesCreatePipelineQosConfigurationRequest =
  components["schemas"]["CreatePipelineQosConfigurationRequest"];
export type PipelinesUpdatePipelineQosConfigurationRequest =
  components["schemas"]["UpdatePipelineQosConfigurationRequest"];
export type PipelinesNetworkQosConfiguration =
  components["schemas"]["NetworkQosConfiguration"];
export type PipelinesIdResponse = components["schemas"]["IdResponse"];

export type PipelinesCreateInstanceQuery =
  PipelinesOperationQuery<"instance.create.post">;
export type PipelinesImportInstanceQuery =
  PipelinesOperationQuery<"instance.import.post">;
export type PipelinesListInstancesQuery =
  PipelinesOperationQuery<"instance.get.all">;
export type PipelinesGetInstanceQuery = PipelinesOperationQuery<"instance.get">;
export type PipelinesUpdateInstanceQuery =
  PipelinesOperationQuery<"instance.put">;
export type PipelinesPatchInstanceQuery =
  PipelinesOperationQuery<"instance.patch">;
export type PipelinesExportInstanceQuery =
  PipelinesOperationQuery<"instance.export.post">;
export type PipelinesEventsQuery =
  PipelinesOperationQuery<"instance.events.all.get">;
export type PipelinesPipelineEventsQuery =
  PipelinesOperationQuery<"instance.events.get">;
export type PipelinesListTemplatesQuery =
  PipelinesOperationQuery<"template.list.get">;
export type PipelinesApplyTemplateQuery =
  PipelinesOperationQuery<"template.apply.post">;
export type PipelinesCreateMigrationInstanceQuery =
  PipelinesOperationQuery<"migration.instance.create.post">;
export type PipelinesUpdateMigrationInstanceQuery =
  PipelinesOperationQuery<"migration.instance.put">;

export type PipelinesCreateInstanceResponse =
  PipelinesOperationJsonResponse<"instance.create.post">;
export type PipelinesImportInstanceResponse =
  PipelinesOperationJsonResponse<"instance.import.post">;
export type PipelinesUpdateInstanceResponse =
  PipelinesOperationJsonResponse<"instance.put">;
export type PipelinesPatchInstanceResponse =
  | PipelinesOperationJsonResponse<"instance.patch">
  | PipelinesPipelineInstance;
export type PipelinesApplyTemplateResponse =
  PipelinesOperationJsonResponse<"template.apply.post">;

export interface PipelinesRequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  accept?: string;
}
