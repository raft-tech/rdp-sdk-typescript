import { describe, expect, it } from "vitest";
import {
  WithTLSSkipVerify,
  defaultOptions,
} from "../../../src/internal/node/options.js";

describe("node options", () => {
  it("defaultOptions returns tlsSkipVerify=false", () => {
    expect(defaultOptions().tlsSkipVerify).toBe(false);
  });

  it("WithTLSSkipVerify enables TLS skip", () => {
    const opts = defaultOptions();
    WithTLSSkipVerify()(opts);
    expect(opts.tlsSkipVerify).toBe(true);
  });
});
