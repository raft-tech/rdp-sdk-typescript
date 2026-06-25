// Configuration:
//   export RDP_SERVER_URL=https://rdp.example.com
//   export RDP_API_KEY=your-api-key
//
// Browser applications should pass those values into endpoint and apiKey.

import { create } from "@bufbuild/protobuf";
import { SearchObjectsRequestSchema } from "../../gen/raft/wdm/v1/service/object_service_pb.js";
import { WithAPIKey, createClient } from "../../src/web/index.js";

const endpoint = "https://rdp.example.com";
const apiKey = "your-api-key";

const client = createClient(endpoint, WithAPIKey(apiKey));

const response = await client.objectService.searchObjects(
  create(SearchObjectsRequestSchema, { pageSize: 10 }),
);

if (response.objects.length === 0) {
  console.log("No WDM objects found.");
} else {
  for (const [index, object] of response.objects.entries()) {
    console.log(
      `${String(index + 1).padStart(2)}. id=${object.id} name=${JSON.stringify(object.name)} status=${object.status}`,
    );
  }
}
