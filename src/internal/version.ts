import pkg from "../../package.json" with { type: "json" };

/**
 * SDK version derived from package.json. The release workflow runs
 * `npm version --no-git-tag-version <version>` before building, so this value
 * follows the published package version.
 */
export const VERSION = pkg.version;
