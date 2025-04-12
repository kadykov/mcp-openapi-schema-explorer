# Project Progress

## Completed Features

### Core Refactoring & New Resource Structure (✓)

1.  **Unified URI Structure:** Implemented a consistent URI structure based on OpenAPI spec hierarchy:
    - `openapi://{field}`: Access top-level fields (info, servers, tags) or list paths/component types.
    - `openapi://paths/{path}`: List methods for a specific path.
    - `openapi://paths/{path}/{method*}`: Get details for one or more operations.
    - `openapi://components/{type}`: List names for a specific component type.
    - `openapi://components/{type}/{name*}`: Get details for one or more components.
2.  **OOP Rendering Layer:** Introduced `Renderable*` classes (`RenderableDocument`, `RenderablePaths`, `RenderablePathItem`, `RenderableComponents`, `RenderableComponentMap`) to encapsulate rendering logic.
    - Uses `RenderContext` and intermediate `RenderResultItem` structure.
    - Supports token-efficient text lists and formatted detail views (JSON/YAML).
3.  **Refactored Handlers:** Created new, focused handlers for each URI pattern:
    - `TopLevelFieldHandler`
    - `PathItemHandler`
    - `OperationHandler`
    - `ComponentMapHandler`
    - `ComponentDetailHandler`
    - Uses shared utilities (`handler-utils.ts`).
4.  **Multi-Value Support:** Correctly handles `*` variables (`method*`, `name*`) passed as arrays by the SDK.
5.  **Testing:**
    - Added unit tests for all new `Renderable*` classes.
    - Added unit tests for all new handler classes.
    - Added E2E tests covering the new URI structure and functionality using `complex-endpoint.json`.
6.  **Archived Old Code:** Moved previous handler/test implementations to `local-docs/old-implementation/`.

### Previous Features (Now Integrated/Superseded)

- Schema Listing (Superseded by `openapi://components/schemas`)
- Schema Details (Superseded by `openapi://components/schemas/{name*}`)
- Endpoint Details (Superseded by `openapi://paths/{path}/{method*}`)
- Endpoint List (Superseded by `openapi://paths`)

### Remote Spec & Swagger v2.0 Support (✓)

1.  **Remote Loading:** Added support for loading specifications via HTTP/HTTPS URLs using `swagger2openapi`.
2.  **Swagger v2.0 Conversion:** Added support for automatically converting Swagger v2.0 specifications to OpenAPI v3.0 using `swagger2openapi`.
3.  **Dependency Change:** Replaced `@apidevtools/swagger-parser` with `swagger2openapi` for loading and conversion.
4.  **Configuration Update:** Confirmed and documented that configuration uses CLI arguments (`<path-or-url-to-spec>`) instead of environment variables.
5.  **Testing:**
    - Updated `SpecLoaderService` unit tests to mock `swagger2openapi` and cover new scenarios (local/remote, v2/v3).
    - Created new E2E test file (`spec-loading.test.ts`) to verify loading from local v2 and remote v3 sources.
    - Added v2.0 test fixture (`sample-v2-api.json`).

## Technical Features (✓)

### Codebase Organization (Updated)

1. File Structure

   - `src/handlers/`: Contains individual handlers and `handler-utils.ts`.
   - `src/rendering/`: Contains `Renderable*` classes, `types.ts`, `utils.ts`.
   - `src/services/`: Updated `spec-loader.ts` to use `swagger2openapi`. Added `formatters.ts`.
   - `src/`: `index.ts`, `config.ts`, `types.ts`.
   - `test/`: Updated unit tests (`spec-loader.test.ts`, `formatters.test.ts`), added new E2E test (`spec-loading.test.ts`), added v2 fixture. Updated `format.test.ts`. Updated `mcp-test-helpers.ts`.
   - `local-docs/old-implementation/`: Archived previous code.

2. Testing Structure

   - Unit tests for rendering classes (`test/__tests__/unit/rendering/`).
   - Unit tests for handlers (`test/__tests__/unit/handlers/`).
   - Unit tests for services (`spec-loader.test.ts`, `reference-transform.test.ts`, `formatters.test.ts`).
   - E2E tests (`refactored-resources.test.ts`, `spec-loading.test.ts`, `format.test.ts`). Added tests for `json-minified`.
   - Fixtures (`test/fixtures/`, including v2 and v3).
   - Test utils (`test/utils/`). Updated `StartServerOptions` type.

3. Type System

   - OpenAPI v3 types.
   - `RenderableSpecObject`, `RenderContext`, `RenderResultItem` interfaces.
   - `FormattedResultItem` type for handler results.
   - `OutputFormat` type updated.
   - `IFormatter` interface.

4. Error Handling
   - Consistent error handling via `createErrorResult` and `formatResults`.
   - Errors formatted as `text/plain`.

### Reference Transformation (✓ - Updated)

- Centralized URI generation logic in `src/utils/uri-builder.ts`.
- `ReferenceTransformService` now correctly transforms all `#/components/...` refs to `openapi://components/{type}/{name}` using the URI builder.
- Path encoding corrected to remove leading slashes before encoding.
- Unit tests updated and passing for URI builder and transformer.

### Output Format Enhancement (✓)

- Added `json-minified` output format option (`--output-format json-minified`).
- Implemented `MinifiedJsonFormatter` in `src/services/formatters.ts`.
- Updated configuration (`src/config.ts`) to accept the new format.
- Added unit tests for the new formatter (`test/__tests__/unit/services/formatters.test.ts`).
- Added E2E tests (`test/__tests__/e2e/format.test.ts`) to verify the new format.
- Updated test helper types (`test/utils/mcp-test-helpers.ts`).

### Dynamic Server Name (✓)

- Modified `src/index.ts` to load the OpenAPI spec before server initialization.
- Extracted `info.title` from the loaded spec.
- Set the `McpServer` name dynamically using the format `Schema Explorer for {title}` with a fallback.

## Planned Features (⏳)

- **Handler Unit Tests:** Complete unit tests for all new handlers (mocking services).
- **Refactor Helpers:** Move duplicated helpers (`formatResults`, `isOpenAPIV3`) from handlers to `handler-utils.ts`. (Deferred during refactor).
- **Security Validation (✓):** Implemented Map-based validation helpers in `handler-utils.ts` and refactored handlers/rendering classes to resolve object injection warnings.
- **Completion Logic (✓):** Implemented `complete` callbacks in `ResourceTemplate` definitions within `src/index.ts` for `{field}`, `{path}`, `{method*}`, `{type}`, and conditionally for `{name*}`. Added E2E tests using `client.complete()`.
- **Reference Traversal:** Service to resolve `$ref` URIs (e.g., follow `openapi://components/schemas/Task` from an endpoint detail).
- **Enhanced Component Support:** Ensure all component types listed in `VALID_COMPONENT_TYPES` are fully handled if present in spec. (Reference transformation now supports all types).
- **Parameter Validation:** Add validation logic if needed. (Current Map-based approach handles key validation).
- **Further Token Optimizations:** Explore more ways to reduce token usage in list/detail views.

## Technical Improvements (Ongoing)

1. Code Quality

   - OOP design for rendering.
   - Clear separation of concerns (Rendering vs. Handling vs. Services).
   - Improved type safety in rendering/handling logic.

2. Testing

   - Unit tests added for rendering logic.
   - Unit tests updated for URI builder, reference transformer, and path item rendering.
   - E2E tests updated for new structure and complex fixture. Added tests for resource completion.
   - Unit tests for `SpecLoaderService` updated for `swagger2openapi`.

3. API Design
   - New URI structure implemented, aligned with OpenAPI spec.
   - Consistent list/detail pattern via rendering layer.
   - Server now accepts remote URLs and Swagger v2.0 specs via CLI argument.
