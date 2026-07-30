import { type RestTransport, encodePath } from "../internal/rest.js";
import type {
  TransformersCreateResponse,
  TransformersPublishVersionResponse,
  TransformersRequestOptions,
  TransformersTransformer,
  TransformersTransformerType,
  TransformersTransformerVersion,
  TransformersUpdateResponse,
} from "./types.js";

const TRANSFORMERS_BASE_PATH = "/api/v2/transformers";

export function transformersBasePath(): string {
  return TRANSFORMERS_BASE_PATH;
}

export function createTransformersClient(
  transport: RestTransport,
): TransformersClient {
  return new DefaultTransformersClient(transport);
}

/** Fluent client for the RDP v2 Transformers REST API. */
export interface TransformersClient {
  readonly workingCopies: TransformersWorkingCopies;
  readonly versions: TransformersVersions;
  readonly catalog: TransformersCatalog;
  readonly types: TransformersTypes;
}

class DefaultTransformersClient implements TransformersClient {
  readonly workingCopies: TransformersWorkingCopies;
  readonly versions: TransformersVersions;
  readonly catalog: TransformersCatalog;
  readonly types: TransformersTypes;

  constructor(private readonly transport: RestTransport) {
    this.workingCopies = new TransformersWorkingCopies(transport);
    this.versions = new TransformersVersions(transport);
    this.catalog = new TransformersCatalog(transport);
    this.types = new TransformersTypes(transport);
  }
}

export class TransformersWorkingCopies {
  constructor(private readonly transport: RestTransport) {}

  list(
    options?: TransformersRequestOptions,
  ): Promise<TransformersTransformer[]> {
    return this.transport.request("GET", "/", options);
  }

  create(
    transformer: TransformersTransformer,
    options?: TransformersRequestOptions,
  ): Promise<TransformersCreateResponse> {
    return this.transport.request("POST", "/", {
      body: transformer,
      ...options,
    });
  }

  get(
    uid: string,
    options?: TransformersRequestOptions,
  ): Promise<TransformersTransformer> {
    return this.transport.request("GET", `/${segment(uid, "uid")}`, options);
  }

  update(
    uid: string,
    transformer: TransformersTransformer,
    options?: TransformersRequestOptions,
  ): Promise<TransformersUpdateResponse> {
    return this.transport.request("PUT", `/${segment(uid, "uid")}`, {
      body: transformer,
      ...options,
    });
  }

  delete(uid: string, options?: TransformersRequestOptions): Promise<void> {
    return this.transport.requestVoid(
      "DELETE",
      `/${segment(uid, "uid")}`,
      options,
    );
  }
}

export class TransformersVersions {
  constructor(private readonly transport: RestTransport) {}

  list(
    uid: string,
    options?: TransformersRequestOptions,
  ): Promise<TransformersTransformerVersion[]> {
    return this.transport.request(
      "GET",
      `/${segment(uid, "uid")}/versions`,
      options,
    );
  }

  publish(
    uid: string,
    transformer: TransformersTransformer,
    options?: TransformersRequestOptions,
  ): Promise<TransformersPublishVersionResponse> {
    return this.transport.request("POST", `/${segment(uid, "uid")}/versions`, {
      body: transformer,
      ...options,
    });
  }

  get(
    uid: string,
    version: string,
    options?: TransformersRequestOptions,
  ): Promise<TransformersTransformerVersion> {
    return this.transport.request(
      "GET",
      `/${segment(uid, "uid")}/versions/${segment(version, "version")}`,
      options,
    );
  }
}

export class TransformersCatalog {
  constructor(private readonly transport: RestTransport) {}

  list(
    options?: TransformersRequestOptions,
  ): Promise<TransformersTransformer[]> {
    return this.transport.request("GET", "/catalog", options);
  }
}

export class TransformersTypes {
  constructor(private readonly transport: RestTransport) {}

  list(
    options?: TransformersRequestOptions,
  ): Promise<TransformersTransformerType[]> {
    return this.transport.request("GET", "/types", options);
  }
}

function segment(value: string, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`rdp: ${name} is required`);
  }
  return encodePath(value);
}
