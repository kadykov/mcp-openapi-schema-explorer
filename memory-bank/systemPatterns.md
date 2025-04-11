# System Patterns

## Architecture Overview

```mermaid
graph TD
    CliArg[CLI Argument (Path/URL)] --> Config[src/config.ts]
    Config --> Server[MCP Server]

    CliArg --> SpecLoader[Spec Loader Service]
    SpecLoader -- Uses --> S2OLib[swagger2openapi Lib]
    SpecLoader --> Transform[Reference Transform Service]
    Transform --> Handlers[Resource Handlers]

    Server --> Handlers

    subgraph Services
        SpecLoader
        Transform
        S2OLib
    end

    subgraph Handlers
        TopLevelFieldHandler[TopLevelField Handler (openapi://{field})]
        PathItemHandler[PathItem Handler (openapi://paths/{path})]
        OperationHandler[Operation Handler (openapi://paths/{path}/{method*})]
        ComponentMapHandler[ComponentMap Handler (openapi://components/{type})]
        ComponentDetailHandler[ComponentDetail Handler (openapi://components/{type}/{name*})]
    end

    subgraph Rendering (OOP)
        RenderableDocument[RenderableDocument]
        RenderablePaths[RenderablePaths]
        RenderablePathItem[RenderablePathItem]
        RenderableComponents[RenderableComponents]
        RenderableComponentMap[RenderableComponentMap]
        RenderUtils[Rendering Utils]
    end

    Handlers --> Rendering
    SpecLoader --> Rendering

    subgraph Utils
        UriBuilder[URI Builder (src/utils)]
    end

    UriBuilder --> Transform
    UriBuilder --> RenderUtils
```

## Component Structure

### Services Layer

- **SpecLoaderService (`src/services/spec-loader.ts`):**
  - Uses `swagger2openapi` library.
  - Loads specification from local file path or remote URL provided via CLI argument.
  - Handles parsing of JSON/YAML.
  - Automatically converts Swagger v2.0 specs to OpenAPI v3.0 objects.
  - Provides the resulting OpenAPI v3.0 document object.
  - Handles errors during loading/conversion.
- **ReferenceTransformService (`src/services/reference-transform.ts`):**
  - Takes the OpenAPI v3.0 document from `SpecLoaderService`.
  - Traverses the document and transforms internal references (e.g., `#/components/schemas/MySchema`) into MCP URIs (e.g., `openapi://components/schemas/MySchema`).
  - Uses `UriBuilder` utility for consistent URI generation.
  - Returns the transformed OpenAPI v3.0 document.
- **Formatters (`src/services/formatters.ts`):**
  - Provide implementations for different output formats (JSON, YAML).
  - Used by handlers to serialize detail view responses.

### Rendering Layer (OOP)

- **Renderable Classes:** Wrapper classes (`RenderableDocument`, `RenderablePaths`, `RenderablePathItem`, `RenderableComponents`, `RenderableComponentMap`) implement `RenderableSpecObject` interface.
- **Interface:** `RenderableSpecObject` defines `renderList()` and `renderDetail()` methods returning `RenderResultItem[]`.
- **RenderResultItem:** Intermediate structure holding data (`unknown`), `uriSuffix`, `isError?`, `errorText?`, `renderAsList?`.
- **RenderContext:** Passed to render methods, contains `formatter` and `baseUri`.
- **Utils:** Helper functions (`getOperationSummary`, `generateListHint`, `createErrorResult`) in `src/rendering/utils.ts`. `generateListHint` now uses centralized URI builder logic.

### Handler Layer

- **Structure:** Separate handlers for each distinct URI pattern/resource type.
- **Responsibilities:**
  - Parse URI variables provided by SDK.
  - Load/retrieve the transformed spec via `SpecLoaderService`.
  - Instantiate appropriate `Renderable*` classes.
  - Invoke the correct rendering method (`renderList` or a specific detail method like `renderTopLevelFieldDetail`, `renderOperationDetail`, `renderComponentDetail`).
  - Format the `RenderResultItem[]` using `formatResults` from `src/handlers/handler-utils.ts`.
  - Construct the final `{ contents: ... }` response object.
  - Instantiate `RenderablePathItem` correctly with raw path and built suffix.
- **Handlers:**
  - `TopLevelFieldHandler`: Handles `openapi://{field}`. Delegates list rendering for `paths`/`components` to `RenderablePaths`/`RenderableComponents`. Renders details for other fields (`info`, `servers`, etc.) via `RenderableDocument.renderTopLevelFieldDetail`.
  - `PathItemHandler`: Handles `openapi://paths/{path}`. Uses `RenderablePathItem.renderList` to list methods. Instantiates `RenderablePathItem` with raw path and built suffix.
  - `OperationHandler`: Handles `openapi://paths/{path}/{method*}`. Uses `RenderablePathItem.renderOperationDetail` for operation details. Handles multi-value `method` variable. Instantiates `RenderablePathItem` with raw path and built suffix.
  - `ComponentMapHandler`: Handles `openapi://components/{type}`. Uses `RenderableComponentMap.renderList` to list component names.
  - `ComponentDetailHandler`: Handles `openapi://components/{type}/{name*}`. Uses `RenderableComponentMap.renderComponentDetail` for component details. Handles multi-value `name` variable.
- **Utils:** Shared functions (`formatResults`, `isOpenAPIV3`, `FormattedResultItem` type) in `src/handlers/handler-utils.ts`.

### Utilities Layer

- **URI Builder (`src/utils/uri-builder.ts`):**
  - Centralized functions for building full URIs (`openapi://...`) and URI suffixes.
  - Handles encoding of path components (removing leading slash first).
  - Used by `ReferenceTransformService` and the rendering layer (`generateListHint`, `Renderable*` classes) to ensure consistency.

### Configuration Layer (`src/config.ts`)

- Parses command-line arguments.
- Expects a single required argument: the path or URL to the specification file.
- Supports an optional `--output-format` argument (json/yaml).
- Validates arguments and provides usage instructions on error.
- Creates the `ServerConfig` object used by the server.

## Resource Design Patterns

### URI Structure (Revised)

- Implicit List/Detail based on path depth.
- Aligned with OpenAPI specification structure.
- **Templates:**
  - `openapi://{field}`: Top-level field details (info, servers) or list trigger (paths, components).
  - `openapi://paths/{path}`: List methods for a specific path.
  - `openapi://paths/{path}/{method*}`: Operation details (supports multiple methods).
  - `openapi://components/{type}`: List names for a specific component type.
  - `openapi://components/{type}/{name*}`: Component details (supports multiple names).
- **Reference URIs (Corrected):**
  - Internal `$ref`s like `#/components/schemas/MySchema` are transformed by `ReferenceTransformService` into resolvable MCP URIs: `openapi://components/schemas/MySchema`.
  - This applies to all component types under `#/components/`.
  - External references remain unchanged.

### Response Format Patterns

1. **Token-Efficient Lists:**
   - `text/plain` format used for all list views (`openapi://paths`, `openapi://components`, `openapi://paths/{path}`, `openapi://components/{type}`).
   - Include hints for navigating to detail views, generated via `generateListHint` using the centralized URI builder.
   - `openapi://paths` format: `METHOD1 METHOD2 /path`
   - `openapi://paths/{path}` format: `METHOD: Summary/OpId`
   - `openapi://components` format: `- type`
   - `openapi://components/{type}` format: `- name`
2. **Detail Views:**
   - Use configured formatter (JSON/YAML via `IFormatter`).
   - Handled by `openapi://{field}` (for non-structural fields), `openapi://paths/{path}/{method*}`, `openapi://components/{type}/{name*}`.
3. **Error Handling:**
   - Handlers catch errors and use `createErrorResult` utility.
   - `formatResults` utility formats errors into `FormattedResultItem` with `isError: true`, `mimeType: 'text/plain'`, and error message in `text`.
4. **Type Safety:**
   - Strong typing with OpenAPI v3 types.
   - `Renderable*` classes encapsulate type-specific logic.
   - `isOpenAPIV3` type guard used in handlers.

## Extension Points

1. Reference Transformers:

   - AsyncAPI transformer
   - GraphQL transformer
   - Custom format transformers

2. Resource Handlers:

   - Schema resource handler
   - Additional reference handlers
   - Custom format handlers (via `IFormatter` interface)

3. URI Resolution:

   - Reference transformation service (`ReferenceTransformService`) handles converting `#/components/{type}/{name}` to `openapi://components/{type}/{name}` URIs during spec loading.
   - Cross-resource linking is implicit via generated URIs in hints and transformed refs.
   - External references are currently kept as-is.

4. Validation:
   - Parameter validation
   - Reference validation
   - Format-specific validation

## Testing Strategy

1. **Unit Tests:**
   - `SpecLoaderService`: Mock `swagger2openapi` to test local/remote and v2/v3 loading logic, including error handling.
   - `ReferenceTransformService`: Verify correct transformation of `#/components/...` refs to MCP URIs.
   - Rendering Classes (`Renderable*`): Test list and detail rendering logic.
   - Handlers: Mock services (`SpecLoaderService`, `IFormatter`) to test URI parsing and delegation to rendering classes.
   - `UriBuilder`: Test URI encoding and generation.
2. **E2E Tests:**
   - Use `mcp-test-helpers` to start the server with different spec inputs.
   - **`spec-loading.test.ts`:** Verify basic resource access (`info`, `paths`, `components`, specific component detail) works correctly when loading:
     - Local Swagger v2.0 spec (`test/fixtures/sample-v2-api.json`).
     - Remote OpenAPI v3.0 spec (e.g., Petstore URL).
   - **`refactored-resources.test.ts`:** Continue to test detailed resource interactions (multi-value params, specific path/method/component combinations, errors) using the primary complex local v3 fixture (`complex-endpoint.json`).
   - **`format.test.ts`:** Verify different output formats (JSON/YAML) work as expected.
3. **Test Support:**
   - Type-safe test utilities (`mcp-test-helpers`).
   - Test fixtures for v2.0 and v3.0 specs.
