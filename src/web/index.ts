// Core exports (platform-agnostic)
export {
  DEFAULT_SERVER_URL,
  type Logger,
  type Option,
  VERSION,
  WithAPIKey,
  WithClientCredentials,
  WithLogger,
  WithTimeout,
} from "../internal/index.js";

// Web platform helpers
export { createLogger } from "../internal/web/logging.js";

// WDM v1 canonical web facade
export {
  type ActionServiceClient,
  createClient,
  type RdpV1WebClient,
  type WebObjectServiceClient,
} from "./client.js";
export { type RdpEnv, loadConfig } from "./config.js";
