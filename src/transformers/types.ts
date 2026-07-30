import type { components, operations } from "./openapi.js";

export type TransformersOperation = keyof operations;

type OperationParameters<Operation extends TransformersOperation> =
  operations[Operation] extends { parameters: infer Parameters }
    ? Parameters
    : never;

type OperationRequestBody<Operation extends TransformersOperation> =
  operations[Operation] extends { requestBody: infer RequestBody }
    ? RequestBody
    : operations[Operation] extends { requestBody?: infer RequestBody }
      ? RequestBody
      : never;

type JsonResponseForStatus<
  Operation extends TransformersOperation,
  Status extends number,
> = Status extends keyof operations[Operation]["responses"]
  ? operations[Operation]["responses"][Status] extends {
      content: { "application/json": infer ResponseBody };
    }
    ? ResponseBody
    : never
  : never;

export type TransformersOperationQuery<
  Operation extends TransformersOperation,
> = OperationParameters<Operation> extends { query: infer Query }
  ? Query
  : OperationParameters<Operation> extends { query?: infer Query }
    ? Query
    : never;

export type TransformersOperationJsonRequest<
  Operation extends TransformersOperation,
> = NonNullable<OperationRequestBody<Operation>> extends {
  content: { "application/json": infer RequestBody };
}
  ? RequestBody
  : never;

export type TransformersOperationJsonResponse<
  Operation extends TransformersOperation,
> =
  | JsonResponseForStatus<Operation, 200>
  | JsonResponseForStatus<Operation, 201>
  | JsonResponseForStatus<Operation, 202>;

export type TransformersErrorResponse = components["schemas"]["ErrorResponse"];
export type TransformersPostResponse = components["schemas"]["PostResp"];
export type TransformersTransformerType =
  components["schemas"]["TransformerType"];
export type TransformersTransformer = components["schemas"]["Transformer"];
export type TransformersTransformerVersionSnapshot =
  components["schemas"]["TransformerVersionSnapshot"];
export type TransformersTransformerVersion =
  components["schemas"]["TransformerVersion"];
export type TransformersTransformerVersionSnapshotConfiguration =
  components["schemas"]["TransformerVersionSnapshotConfiguration"];
export type TransformersEnvironmentTemplate =
  components["schemas"]["EnvironmentTpl"];
export type TransformersFileConfigTemplate =
  components["schemas"]["FileCfgTpl"];
export type TransformersPropertyTemplate = components["schemas"]["PropertyTpl"];
export type TransformersDataConnectionTemplate =
  components["schemas"]["DataConnTpl"];
export type TransformersConfigurationTemplate =
  components["schemas"]["ConfigurationTpl"];
export type TransformersCreationConfig =
  components["schemas"]["CreationConfig"];
export type TransformersLabel = components["schemas"]["Label"];
export type TransformersAccess = components["schemas"]["Access"];

export type TransformersCreateResponse =
  TransformersOperationJsonResponse<"transformers.create">;
export type TransformersUpdateResponse =
  TransformersOperationJsonResponse<"transformers.update">;
export type TransformersPublishVersionResponse =
  TransformersOperationJsonResponse<"transformerVersions.publish">;

export interface TransformersRequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  accept?: string;
}
