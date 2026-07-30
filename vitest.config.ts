import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/index.ts",
        "src/catalog/openapi.ts",
        "src/catalog/types.ts",
        "src/pipelines/openapi.ts",
        "src/pipelines/types.ts",
        "src/transformers/openapi.ts",
        "src/transformers/types.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
