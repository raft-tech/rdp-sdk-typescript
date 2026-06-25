import {
  type Client,
  createClient as connectCreateClient,
} from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { ActionService } from "../../gen/raft/wdm/v1/service/action_service_pb.js";
import { ObjectService } from "../../gen/raft/wdm/v1/service/object_service_pb.js";
import { type Option, defaultOptions } from "../internal/options.js";
import {
  buildInterceptors,
  resolveArgs,
  resolveEndpoint,
} from "../internal/transport.js";
import { VERSION } from "../internal/version.js";
import { createLogger } from "../internal/web/logging.js";
import { webTokenFetcher } from "../internal/web/token-fetcher.js";

/** Full ObjectService client from ConnectRPC (not exported — see WebObjectServiceClient). */
type FullObjectServiceClient = Client<typeof ObjectService>;

/** Typed ActionService client from ConnectRPC. */
export type ActionServiceClient = Client<typeof ActionService>;

/**
 * Web ObjectService client — omits publishObjects (client-streaming)
 * because browsers do not support client-streaming via the Fetch API.
 */
export type WebObjectServiceClient = Omit<
  FullObjectServiceClient,
  "publishObjects"
>;

/**
 * WDM v1 canonical web SDK client. Construct via [createClient]; new
 * ConnectRPC services exposed by the canonical model surface here as
 * additional fields.
 */
export interface RdpV1WebClient {
  readonly objectService: WebObjectServiceClient;
  readonly actionService: ActionServiceClient;
}

/**
 * Create a new WDM v1 (canonical) web SDK client.
 *
 * Call with an explicit endpoint string, or omit it to use
 * [DEFAULT_SERVER_URL] ("https://rdp.local"). There is no programmatic
 * hostname/port option — the web SDK consumes its endpoint directly.
 *
 * Note: PublishObjects (client-streaming) is not available in browsers.
 * Use the Node.js SDK for client-streaming support.
 *
 * @example
 * ```ts
 * import { createClient, WithClientCredentials } from "rdp-sdk-typescript/wdm/web";
 *
 * const client = createClient("https://wdm.example.com",
 *   WithClientCredentials(clientId, clientSecret),
 * );
 * ```
 */
export function createClient(
  ...args: [string, ...Option[]] | Option[]
): RdpV1WebClient {
  const { rawEndpoint, opts } = resolveArgs<Option>(args);

  const o = defaultOptions();
  for (const opt of opts) {
    opt(o);
  }

  const endpoint = resolveEndpoint(rawEndpoint);
  const logger = createLogger(o.logger);

  const interceptors = buildInterceptors(
    endpoint,
    o,
    webTokenFetcher(),
    logger,
  );

  const transport = createConnectTransport({
    baseUrl: endpoint,
    interceptors,
  });

  logger.info({ endpoint, version: VERSION }, "client initialized");

  return {
    objectService: connectCreateClient(ObjectService, transport),
    actionService: connectCreateClient(ActionService, transport),
  };
}
