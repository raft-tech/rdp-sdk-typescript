// Configuration:
//   export RDP_SERVER_URL=https://rdp.example.com
//   export RDP_API_KEY=your-api-key
//
// Browser applications should pass those values into endpoint and apiKey.

import { ObjectStatus } from "@buf/raft_wdm.bufbuild_es/raft/wdm/v1/object_pb.js";
import { PublishObjectRequestSchema } from "@buf/raft_wdm.bufbuild_es/raft/wdm/v1/service/object_service_pb.js";
import { create } from "@bufbuild/protobuf";
import { timestampNow } from "@bufbuild/protobuf/wkt";
import { WithAPIKey, createClient } from "../../src/web/index.js";

const endpoint = "https://rdp.example.com";
const apiKey = "your-api-key";
const exampleObjectId = "sdk-example-object";
const exampleProvenanceId = "sdk-example-provenance";
const objectName = "RDP SDK example object";

const client = createClient(endpoint, WithAPIKey(apiKey));

await client.objectService.publishObject(
  create(PublishObjectRequestSchema, {
    object: {
      id: exampleObjectId,
      name: objectName,
      description:
        "Created by the RDP SDK for TypeScript Web objects-publish example.",
      status: ObjectStatus.ACTIVE,
      labels: { example: "objects-publish" },
      provenance: {
        id: exampleProvenanceId,
        name: "RDP SDK for TypeScript Web example",
        producer: "rdp-sdk-typescript/examples/web/objects-publish",
        updatedAt: timestampNow(),
      },
    },
  }),
);

console.log(
  `Published object id=${exampleObjectId} name=${JSON.stringify(objectName)}`,
);
