# Active Context

## Current Focus

Completed setup of automated versioning and releases using `semantic-release` and updated the CI workflow. Corrected dependency categorization in `package.json`. Updated Memory Bank.

## Recent Progress

### Dependency Cleanup & Release Automation (✓)

1.  **Dependency Correction:**
    - Moved `swagger2openapi` from `devDependencies` to `dependencies` in `package.json`.
    - Moved `@types/js-yaml` from `dependencies` to `devDependencies` in `package.json`.
    - Removed unused `@types/swagger-parser` from `devDependencies` in `package.json`.
    - Ran `npm install` to update `package-lock.json`.
2.  **Semantic Release Setup:**
    - Installed `semantic-release` and plugins (`@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/changelog`, `@semantic-release/npm`, `@semantic-release/github`, `@semantic-release/git`, `@semantic-release/exec`) as dev dependencies.
    - Created `scripts/generate-version.js` to write the release version to `src/version.ts`.
    - Created `.releaserc.json` configuring the release workflow, including using `@semantic-release/exec` to run the generation script and `@semantic-release/git` to commit `src/version.ts`.
    - Updated `eslint.config.js` to correctly lint the `generate-version.js` script.
3.  **Dynamic Versioning:**
    - Created a default `src/version.ts` file (with version `0.0.0-dev`) tracked by Git to ensure local/CI builds work.
    - Updated `src/index.ts` to import `VERSION` from `src/version.ts` and use it in the `McpServer` constructor.
    - The default `src/version.ts` will be overwritten with the correct release version by `semantic-release` during the release process.
4.  **CI Workflow Adaptation:**
    - Updated `.github/workflows/ci.yml`.
    - Removed Docker Compose dependency from the `test` job.
    - Standardized on Node 22 for `test` and `security` jobs.
    - Added `extractions/setup-just@v3` action to both jobs.
    - Updated `test` job to run checks via `just all`.
    - Updated `security` job to run checks via `just security` (keeping CodeQL separate).
    - Added a new `release` job triggered on pushes to `main` (after `test` and `security` pass) that uses `cycjimmy/semantic-release-action@v4`. Configured necessary permissions and environment variables (`GITHUB_TOKEN`, `NPM_TOKEN`).
5.  **Memory Bank Update (✓):** Updated `activeContext.md`, `progress.md`, `systemPatterns.md`, and `techContext.md`.

### Docker Support Implementation (✓)

1.  **Dockerfile Strategy:**
    - Moved existing devcontainer `Dockerfile` to `.devcontainer/Dockerfile`.
    - Updated `.devcontainer/devcontainer.json` to reference the new path.
    - Created a new multi-stage production `Dockerfile` at the project root (`./Dockerfile`).
2.  **Docker Plugin:**
    - Installed `@codedependant/semantic-release-docker` dev dependency.
    - Configured the plugin in `.releaserc.json` to publish to `kadykov/mcp-openapi-schema-explorer` on Docker Hub, disabling the plugin's built-in login.
3.  **CI Workflow Update (`.github/workflows/ci.yml`):**
    - Added Docker setup steps (QEMU, Buildx, Login using `docker/login-action@v3` with `DOCKERHUB_USERNAME` var and `DOCKERHUB_TOKEN` secret) to the `release` job.
    - Updated the `cycjimmy/semantic-release-action@v4` step to include `@codedependant/semantic-release-docker` in `extra_plugins`.
    - Removed redundant Node.js setup and `npm ci` steps from the `release` job, as the action handles plugin installation.
4.  **Documentation:** Updated `README.md` with a "Usage with Docker" section, including `docker run` examples and MCP client configuration examples for local and remote specs.

### Dynamic Server Name (✓)

1.  **Spec Loading:** Modified `src/index.ts` to load the OpenAPI spec using `createSpecLoader` _before_ initializing `McpServer`.
2.  **Name Generation:** Extracted `info.title` from the loaded spec and constructed a dynamic server name (`Schema Explorer for {title}`) with a fallback to `'OpenAPI Schema Explorer'`.
3.  **Server Initialization:** Updated `McpServer` constructor in `src/index.ts` to use the generated dynamic name.
4.  **Dependency Injection:** Confirmed handlers already receive the shared `specLoader` instance correctly, requiring no changes to handler constructors.
5.  **Memory Bank Update (✓):** Updated `activeContext.md` and `progress.md`.

### Resource Completion Logic (✓)

1.  **Implementation:** Modified `src/index.ts` to define `ResourceTemplate` objects directly within `server.resource()` calls. Added `complete` property with functions providing suggestions for `{field}`, `{path}`, `{method*}`, and `{type}` based on the loaded `transformedSpec`.
2.  **Conditional Name Completion:** Implemented logic for the `{name*}` completion in the `openapi://components/{type}/{name*}` template. It now provides component names only if the spec contains exactly one component type (e.g., only `schemas`). Otherwise, it returns an empty list. Used `getValidatedComponentMap` helper for safe access.
3.  **Testing:**
    - Added new E2E test suite (`Completion Tests`) to `test/__tests__/e2e/resources.test.ts` using the `client.complete()` method.
    - Added new test fixture `test/fixtures/multi-component-types.json` to cover the multi-type scenario for name completion.
    - Verified all tests pass.
4.  **Memory Bank Update (✓):** Updated `activeContext.md`, `progress.md`, `systemPatterns.md`, and `projectbrief.md`.

### Dynamic Server Name (✓)

1.  **Spec Loading:** Modified `src/index.ts` to load the OpenAPI spec using `createSpecLoader` _before_ initializing `McpServer`.
2.  **Name Generation:** Extracted `info.title` from the loaded spec and constructed a dynamic server name (`Schema Explorer for {title}`) with a fallback to `'OpenAPI Schema Explorer'`.
3.  **Server Initialization:** Updated `McpServer` constructor in `src/index.ts` to use the generated dynamic name.
4.  **Dependency Injection:** Confirmed handlers already receive the shared `specLoader` instance correctly, requiring no changes to handler constructors.
5.  **Memory Bank Update (✓):** Updated `activeContext.md` and `progress.md`.

### Minified JSON Output Format (✓)

1.  **Formatter:** Added `MinifiedJsonFormatter` to `src/services/formatters.ts` and updated `OutputFormat` type and `createFormatter` function.
2.  **Configuration:** Updated `src/config.ts` to accept `--output-format json-minified`.
3.  **Unit Tests:** Added unit tests for `MinifiedJsonFormatter` in `test/__tests__/unit/services/formatters.test.ts`.
4.  **E2E Tests:** Added E2E tests for the `json-minified` format in `test/__tests__/e2e/format.test.ts`.
5.  **Test Helpers:** Updated `StartServerOptions` type in `test/utils/mcp-test-helpers.ts`.
6.  **Memory Bank Update (✓):** Updated `techContext.md`, `systemPatterns.md`, `progress.md`, and `activeContext.md`.

### Remote Spec & Swagger v2.0 Support (✓)

1.  **Remote Loading:** Added support for loading specifications via HTTP/HTTPS URLs using `swagger2openapi` in `SpecLoaderService`.
2.  **Swagger v2.0 Conversion:** Added support for automatically converting Swagger v2.0 specifications to OpenAPI v3.0 using `swagger2openapi` in `SpecLoaderService`.
3.  **Dependency Change:** Replaced `@apidevtools/swagger-parser` with `swagger2openapi`. Added `@types/swagger2openapi`. Reinstalled `openapi-types`.
4.  **Configuration:** Confirmed configuration uses CLI arguments (`<path-or-url-to-spec>`).
5.  **Testing:**
    - Updated `SpecLoaderService` unit tests (`spec-loader.test.ts`) to mock `swagger2openapi` and cover new scenarios (local/remote, v2/v3). Fixed linting/hoisting issues in mocks.
    - Created new E2E test file (`spec-loading.test.ts`) to verify loading from local v2 and remote v3 sources. Added necessary helpers and fixed linting issues.
    - Added v2.0 test fixture (`sample-v2-api.json`).
6.  **Memory Bank Update (✓):** Updated `productContext.md`, `techContext.md`, `systemPatterns.md`, `progress.md`, and `activeContext.md` to reflect these changes.

### Major Refactor (Previously Completed - ✓)

1.  **Unified URI Structure:** Implemented consistent URIs based on OpenAPI spec hierarchy (`openapi://{field}`, `openapi://paths/...`, `openapi://components/...`).
2.  **OOP Rendering Layer:** Created `Renderable*` classes for modular rendering logic (`src/rendering/`).
3.  **Refactored Handlers:** Replaced old handlers with new, focused handlers (`src/handlers/`).
    - `TopLevelFieldHandler`
    - `PathItemHandler`
    - `OperationHandler`
    - `ComponentMapHandler`
    - `ComponentDetailHandler`
4.  **Shared Utilities:** Extracted common logic into `src/rendering/utils.ts` and `src/handlers/handler-utils.ts`.
5.  **Multi-Value Handling:** Correctly implemented handling for `*` variables (`method*`, `name*`).
6.  **Testing:**
    - Added/passed unit tests for all `Renderable*` classes.
    - Added/passed E2E tests for the new URI structure using `complex-endpoint.json`.
7.  **Documentation:** Updated `systemPatterns.md` and `progress.md`.
8.  **Archived Old Code:** Moved previous implementations to `local-docs/old-implementation/`.
9.  **URI Generation Refactor (✓):**
    - Created centralized URI builder utility (`src/utils/uri-builder.ts`).
    - Updated `$ref` transformation (`src/services/reference-transform.ts`) to use the builder and support all component types (`openapi://components/{type}/{name}`).
    - Updated hint generation (`src/rendering/utils.ts`, `components.ts`, `path-item.ts`) to use the builder.
    - Corrected path encoding in builder (removed leading slash encoding).
    - Updated relevant unit tests (`uri-builder.test.ts`, `reference-transform.test.ts`, `path-item.test.ts`).
    - Fixed `RenderablePathItem` instantiation in handlers (`path-item-handler.ts`, `operation-handler.ts`).
10. **Security Fix (✓):** Resolved `security/detect-object-injection` warnings by implementing Map-based validation helpers (`getValidatedPathItem`, `getValidatedOperations`, `getValidatedComponentMap`, `getValidatedComponentDetails`) in `handler-utils.ts` and refactoring handlers (`operation-handler`, `path-item-handler`, `component-map-handler`, `component-detail-handler`) and rendering classes (`RenderablePaths`, `RenderableComponents`, `RenderableComponentMap`) to use safe access patterns inspired by the old implementation.

## Implementation Status

- Server now loads OpenAPI v3.0 and Swagger v2.0 specs from local files or remote URLs.
- Swagger v2.0 specs are automatically converted to v3.0.
- Internal references are transformed to MCP URIs.
- Added `json-minified` output format option.
- Server name is now dynamically set based on the loaded spec's `info.title`.
- **New:** Automated versioning and release process implemented using `semantic-release`.
- **New:** CI workflow adapted for Node 22, uses `just` for checks, and includes a `release` job using `cycjimmy/semantic-release-action@v4`.
- **New:** Docker support added, including a production `Dockerfile`, integration with `semantic-release` via `@codedependant/semantic-release-docker`, and updated CI workflow for automated Docker Hub publishing.
- Dependencies correctly categorized (`swagger2openapi` in `dependencies`, types in `devDependencies`).
- Resource completion logic implemented.
- Dynamic server name implemented.
- Minified JSON output format added.
- Remote spec loading and Swagger v2.0 conversion support added.
- Core resource exploration functionality remains operational.
- Unit tests for `SpecLoaderService` and `Formatters` are updated.
- E2E tests cover basic loading scenarios, output formats, resource exploration, and resource completion.

## Next Actions / Immediate Focus

1.  **README Update (Partially Done):**
    - **Done:** Added Docker usage instructions.
    - **TODO:** Add details about the automated release process (npm + Docker) and Conventional Commits requirement.
    - **TODO:** Add instructions for setting up `NPM_TOKEN`, `DOCKERHUB_USERNAME`, and `DOCKERHUB_TOKEN` secrets/variables.
2.  **Handler Unit Tests:** Implement comprehensive unit tests for each handler class (`TopLevelFieldHandler`, `PathItemHandler`, etc.), mocking `SpecLoaderService` and `IFormatter`.
3.  **Refactor Helpers:** Consolidate duplicated helper functions (`formatResults`, `isOpenAPIV3`) fully into `handler-utils.ts` and remove from individual handlers.
4.  **Code Cleanup:** Address remaining TODOs (e.g., checking warnings in `spec-loader.ts`) and minor ESLint warnings.

## Future Considerations (Post Immediate Actions)

- Implement reference traversal/resolution service.
- Enhance support for all component types.
