# Active Context

## Current Focus

Completed implementation of remote specification loading (via URL) and Swagger v2.0 support. Updated Memory Bank.

## Recent Progress

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
- **New:** Added `json-minified` output format option.
- Core resource exploration functionality remains operational with the new loading mechanism and output format.
- Unit tests for `SpecLoaderService` and `Formatters` are updated.
- E2E tests cover basic loading scenarios and output formats (JSON, YAML, Minified JSON).

## Next Actions / Immediate Focus

1.  **Handler Unit Tests:** Implement comprehensive unit tests for each handler class (`TopLevelFieldHandler`, `PathItemHandler`, etc.), mocking `SpecLoaderService` and `IFormatter`.
2.  **Refactor Helpers:** Consolidate duplicated helper functions (`formatResults`, `isOpenAPIV3`) fully into `handler-utils.ts` and remove from individual handlers.
3.  **Code Cleanup:** Address remaining TODOs (e.g., checking warnings in `spec-loader.ts`) and minor ESLint warnings.
4.  **README Update:** Enhance `README.md` with detailed usage examples and explanations, including the new output format (deferred from this task).

## Future Considerations (Post Immediate Actions)

- Implement `complete` callbacks for resource templates.
- Implement reference traversal/resolution service.
- Enhance support for all component types.
