# RDP SDK for TypeScript

The RDP SDK for TypeScript is part of the unified SDK family for
client applications interacting with Raft Data Platform (RDP). It
provides typed Node and Web clients plus endpoint, authentication, TLS,
and logging helpers for the RDP API surface.

For platform concepts, API guides, and integration details, see
https://developer.teamraft.com.

## Installation

```bash
npm config set @buf:registry https://buf.build/gen/npm/v1
npm install @raft-tech/rdp-sdk-typescript
```

The scoped registry provides the public TypeScript package generated from the
[`raft/wdm`](https://buf.build/raft/wdm) Buf module.

## Quick Start

```bash
export RDP_SERVER_URL=https://rdp.example.com
export RDP_API_KEY=your-api-key
```

```ts
import { create } from "@bufbuild/protobuf";
import {
  createClient,
  fromNodeConfig,
  loadConfig,
} from "@raft-tech/rdp-sdk-typescript";
import { SearchObjectsRequestSchema } from "@buf/raft_wdm.bufbuild_es/raft/wdm/v1/service/object_service_pb.js";

// Load RDP_SERVER_URL and authentication from the environment.
const cfg = loadConfig();

// Create a client from the loaded config.
const client = createClient(...fromNodeConfig(cfg));

// Request the first 10 WDM objects.
const response = await client.objectService.searchObjects(
  create(SearchObjectsRequestSchema, { pageSize: 10 }),
);

if (response.objects.length === 0) {
  console.log("No WDM objects found.");
} else {
  for (const object of response.objects) {
    console.log(`${object.id}\t${object.name}`);
  }
}
```

For more examples, see [examples](examples/).

## Configuration

Node clients can call `loadConfig()` to read connection settings from
environment variables and optional `.env.local` files. Web clients pass
the same keys as a plain object to the web `loadConfig` helper. For
browser applications, import from `@raft-tech/rdp-sdk-typescript/web`.

| Variable | Required | Description |
| --- | --- | --- |
| `RDP_SERVER_URL` | No | Base RDP endpoint. Defaults to `https://rdp.local`; use scheme and host only. |
| `RDP_SERVER_PORT` | No | Optional port override for the endpoint. |
| `TLS_SKIP_VERIFY` | No | Node only. Set to `true` only for development or test endpoints with self-signed certificates. |

### Authentication

API key authentication is the preferred method for client applications.
Use OAuth2 client credentials or a static Bearer token only when your
deployment requires it.

| Method | Variables | Request behavior |
| --- | --- | --- |
| API key | `RDP_API_KEY` | Sends the value on each request as an API key header. |
| OAuth2 client credentials | `RDP_CLIENT_ID`, `RDP_CLIENT_SECRET` | Fetches a token from `{RDP_SERVER_URL}/api/v1/auth/token` and sends it as a bearer token. |
| Bearer | `RDP_BEARER_TOKEN` | Sends `Authorization: Bearer <token>`. |

Providing multiple auth methods is an error. If no method is configured,
requests are sent without auth and the SDK logs a warning.

### Functional Configuration

Pass functional options to `createClient(endpoint, ...options)`. Node
clients can also start from `loadConfig()` and pass the result through
`fromNodeConfig(cfg)`.

For direct Node construction:

```ts
const client = createClient(
  "https://rdp.example.com",
  WithAPIKey("your-api-key"),
  WithTimeout(10_000),
  WithLogger(console),
);
```

Static `Authorization` header auth can be configured directly as well:

```ts
const bearerClient = createClient(
  "https://rdp.example.com",
  WithBearerToken("token"),
);
```

For Node environment-first configuration with call-site overrides:

```ts
const cfg = loadConfig({ envPath: ".env.local", logger: console });
const [endpoint, ...options] = fromNodeConfig(cfg);

const client = createClient(
  endpoint,
  ...options,
  WithTimeout(10_000),
);
```

For browser applications, import from
`@raft-tech/rdp-sdk-typescript/web` and pass configuration as a plain
object:

```ts
const rawConfig = {
  RDP_SERVER_URL: "https://rdp.example.com",
  RDP_BEARER_TOKEN: "token",
};
const cfg = loadConfig(rawConfig, console);

const client = createClient(
  cfg.serverUrl,
  WithBearerToken(rawConfig.RDP_BEARER_TOKEN),
  WithTimeout(10_000),
);
```

Use `WithClientCredentials(clientId, clientSecret)` only when your
deployment requires OAuth2 client credentials. Use `WithTLSSkipVerify()`
only in Node for development or test endpoints with self-signed
certificates.

Browser hosts can provide their own fetch implementation for auth,
instrumentation, or embedded runtimes:

```ts
import { createClient, WithFetch } from "@raft-tech/rdp-sdk-typescript/web";

const client = createClient(
  "https://rdp.example.com",
  WithFetch(authenticatedFetch),
);
```
