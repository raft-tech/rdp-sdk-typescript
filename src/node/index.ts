// Core exports (platform-agnostic)
export {
  DEFAULT_SERVER_URL,
  type Logger,
  type Option,
  VERSION,
  type RdpConfig,
  WithAPIKey,
  WithClientCredentials,
  WithLogger,
  WithTimeout,
  fromConfig,
} from "../internal/index.js";

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
