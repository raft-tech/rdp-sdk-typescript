// Run:
//   export RDP_SERVER_URL=https://rdp.example.com
//   export RDP_API_KEY=your-api-key
//   npm run build
//   node dist/examples/objects-publish.js

import { create } from "@bufbuild/protobuf";
import { timestampNow } from "@bufbuild/protobuf/wkt";
import { ObjectStatus } from "../gen/raft/wdm/v1/object_pb.js";
import { PublishObjectRequestSchema } from "../gen/raft/wdm/v1/service/object_service_pb.js";
import { createClient, fromNodeConfig, loadConfig } from "../src/node/index.js";

const exampleObjectId = "sdk-example-object";
const exampleProvenanceId = "sdk-example-provenance";
const objectName = "RDP SDK example object";

const cfg = loadConfig();
const client = createClient(...fromNodeConfig(cfg));

await client.objectService.publishObject(
  create(PublishObjectRequestSchema, {
    object: {
      id: exampleObjectId,
      name: objectName,
      description:
        "Created by the RDP SDK for TypeScript objects-publish example.",
      status: ObjectStatus.ACTIVE,
      labels: { example: "objects-publish" },
      provenance: {
        id: exampleProvenanceId,
        name: "RDP SDK for TypeScript example",
        producer: "rdp-sdk-typescript/examples/objects-publish",
        updatedAt: timestampNow(),
      },
    },
  }),
);

console.log(
  `Published object id=${exampleObjectId} name=${JSON.stringify(objectName)}`,
);
