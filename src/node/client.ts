import { ActionService } from "@buf/raft_wdm.bufbuild_es/raft/wdm/v1/service/action_service_pb.js";
import { ObjectService } from "@buf/raft_wdm.bufbuild_es/raft/wdm/v1/service/object_service_pb.js";
import {
  type Client,
  createClient as connectCreateClient,
} from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import {
  type CatalogClient,
  catalogBasePath,
  createCatalogClient,
} from "../catalog/index.js";
import { nodeFetch } from "../internal/node/fetch.js";
import { createLogger } from "../internal/node/logging.js";
import { type NodeOption, defaultOptions } from "../internal/node/options.js";
import { nodeTokenFetcher } from "../internal/node/token-fetcher.js";
import { RestTransport } from "../internal/rest.js";
import {
  buildInterceptors,
  resolveArgs,
  resolveAuth,
  resolveEndpoint,
} from "../internal/transport.js";
import { VERSION } from "../internal/version.js";
import {
  type PipelinesClient,
  createPipelinesClient,
  pipelinesBasePath,
} from "../pipelines/index.js";
import {
  type TransformersClient,
  createTransformersClient,
  transformersBasePath,
} from "../transformers/index.js";

/** Typed ObjectService client from ConnectRPC. */
export type ObjectServiceClient = Client<typeof ObjectService>;

/** Typed ActionService client from ConnectRPC. */
export type ActionServiceClient = Client<typeof ActionService>;

/**
 * WDM v1 canonical SDK client. Construct via [createClient]; new ConnectRPC
 * services exposed by the canonical model surface here as additional fields.
 */
export interface RdpV1Client {
  readonly objectService: ObjectServiceClient;
  readonly actionService: ActionServiceClient;
  readonly catalog: CatalogClient;
  readonly pipelines: PipelinesClient;
  readonly transformers: TransformersClient;
}

/**
 * Create a new WDM v1 (canonical) SDK client.
 *
 * Call with an explicit endpoint string, or omit it to use
 * [DEFAULT_SERVER_URL] ("https://rdp.local"). For port overrides, use the
 * RDP_SERVER_PORT env var consumed by [loadConfig] — there is no
 * programmatic hostname/port option.
 *
 * @example
 * ```ts
 * // Explicit endpoint
 * const client = createClient("https://wdm.example.com",
 *   WithClientCredentials(clientId, clientSecret),
 * );
 *
 * // Default endpoint (https://rdp.local)
 * const client = createClient(WithClientCredentials(clientId, clientSecret));
 * ```
 */
export function createClient(
  ...args: [string, ...NodeOption[]] | NodeOption[]
): RdpV1Client {
  const { rawEndpoint, opts } = resolveArgs<NodeOption>(args);

  const o = defaultOptions();
  for (const opt of opts) {
    opt(o);
  }

  const endpoint = resolveEndpoint(rawEndpoint);
  const logger = createLogger(o.logger);
  const auth = resolveAuth(o, logger);
  const tokenFetcher = nodeTokenFetcher(o.tlsSkipVerify);

  if (o.tlsSkipVerify) {
    logger.warn({}, "rdp: TLS certificate verification disabled (insecure)");
  }

  const interceptors = buildInterceptors(
    endpoint,
    o,
    tokenFetcher,
    logger,
    auth,
  );

  const transport = createConnectTransport({
    baseUrl: endpoint,
    httpVersion: "2",
    nodeOptions: o.tlsSkipVerify ? { rejectUnauthorized: false } : undefined,
    interceptors,
  });
  const restFetch = nodeFetch(o.tlsSkipVerify);

  logger.info({ endpoint, version: VERSION }, "client initialized");

  return {
    objectService: connectCreateClient(ObjectService, transport),
    actionService: connectCreateClient(ActionService, transport),
    catalog: createCatalogClient(
      new RestTransport({
        endpoint,
        basePath: catalogBasePath(),
        auth,
        tokenFetcher,
        logger,
        timeout: o.timeout,
        fetch: restFetch,
      }),
    ),
    pipelines: createPipelinesClient(
      new RestTransport({
        endpoint,
        basePath: pipelinesBasePath(),
        auth,
        tokenFetcher,
        logger,
        timeout: o.timeout,
        fetch: restFetch,
      }),
    ),
    transformers: createTransformersClient(
      new RestTransport({
        endpoint,
        basePath: transformersBasePath(),
        auth,
        tokenFetcher,
        logger,
        timeout: o.timeout,
        fetch: restFetch,
      }),
    ),
  };
}
