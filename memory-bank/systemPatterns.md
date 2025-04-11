# System Patterns

## Architecture Overview

```mermaid
graph TD
    Config[Configuration] --> Server[MCP Server]
    Spec[OpenAPI Spec File] --> SpecLoader[Spec Loader]
    Transform[Reference Transform] --> SpecLoader
    SpecLoader --> Handlers[Resource Handlers]
    Server --> Handlers

    subgraph Services
        SpecLoader
        Transform
        subgraph Transformers[Transformers]
            OpenAPITransform[OpenAPI Transformer]
            AsyncAPITransform[AsyncAPI Transformer]
            GraphQLTransform[GraphQL Transformer]
        end
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
```

## Component Structure

### Services Layer
- SpecLoader: Loads and transforms OpenAPI specifications
  - Parses spec without resolving references
  - Integrates with reference transformation
  - Provides typed access to spec data
  - Handles file loading and caching

- ReferenceTransform: Manages reference transformations
  - Format-agnostic transformer interface
  - OpenAPI reference transformation
  - Type-safe implementation
  - Extensible for other formats

### Rendering Layer (OOP)
- **Renderable Classes:** Wrapper classes (`RenderableDocument`, `RenderablePaths`, `RenderablePathItem`, `RenderableComponents`, `RenderableComponentMap`) implement `RenderableSpecObject` interface.
- **Interface:** `RenderableSpecObject` defines `renderList()` and `renderDetail()` methods returning `RenderResultItem[]`.
- **RenderResultItem:** Intermediate structure holding data (`unknown`), `uriSuffix`, `isError?`, `errorText?`, `renderAsList?`.
- **RenderContext:** Passed to render methods, contains `formatter` and `baseUri`.
- **Utils:** Helper functions (`getOperationSummary`, `generateListHint`, `createErrorResult`) in `src/rendering/utils.ts`.

### Handler Layer
- **Structure:** Separate handlers for each distinct URI pattern/resource type.
- **Responsibilities:**
    - Parse URI variables provided by SDK.
    - Load/retrieve the transformed spec via `SpecLoaderService`.
    - Instantiate appropriate `Renderable*` classes.
    - Invoke the correct rendering method (`renderList` or a specific detail method like `renderTopLevelFieldDetail`, `renderOperationDetail`, `renderComponentDetail`).
    - Format the `RenderResultItem[]` using `formatResults` from `src/handlers/handler-utils.ts`.
    - Construct the final `{ contents: ... }` response object.
- **Handlers:**
    - `TopLevelFieldHandler`: Handles `openapi://{field}`. Delegates list rendering for `paths`/`components` to `RenderablePaths`/`RenderableComponents`. Renders details for other fields (`info`, `servers`, etc.) via `RenderableDocument.renderTopLevelFieldDetail`.
    - `PathItemHandler`: Handles `openapi://paths/{path}`. Uses `RenderablePathItem.renderList` to list methods.
    - `OperationHandler`: Handles `openapi://paths/{path}/{method*}`. Uses `RenderablePathItem.renderOperationDetail` for operation details. Handles multi-value `method` variable.
    - `ComponentMapHandler`: Handles `openapi://components/{type}`. Uses `RenderableComponentMap.renderList` to list component names.
    - `ComponentDetailHandler`: Handles `openapi://components/{type}/{name*}`. Uses `RenderableComponentMap.renderComponentDetail` for component details. Handles multi-value `name` variable.
- **Utils:** Shared functions (`formatResults`, `isOpenAPIV3`, `FormattedResultItem` type) in `src/handlers/handler-utils.ts`.

### Configuration Layer
- Environment variables validation (via `src/config.ts`)
- Server configuration
- Spec file path management

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
- **Reference URIs (Unchanged for now):**
    - `openapi://schema/{name}` - Schema reference (Note: This is how refs are *generated*, but access is via `openapi://components/schemas/{name*}`)
    - (Potential future: `openapi://parameter/{name}`, `openapi://response/{name}` etc. accessed via `openapi://components/...`)

### Response Format Patterns
1. **Token-Efficient Lists:**
   - `text/plain` format used for all list views (`openapi://paths`, `openapi://components`, `openapi://paths/{path}`, `openapi://components/{type}`).
   - Include hints for navigating to detail views.
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
   - Reference transformation service (`ReferenceTransformService`) handles converting `#/components/schemas/...` to `openapi://schema/...` URIs during spec loading. (Note: Accessing these requires the new `openapi://components/schemas/...` URI).
   - Cross-resource linking is implicit via generated URIs in hints and transformed refs.
   - External references are currently kept as-is.

4. Validation:
   - Parameter validation
   - Reference validation
   - Format-specific validation

## Testing Strategy
1. Unit Tests
   - Handler tests with type safety
   - Rendering class tests (`Renderable*` classes).
   - Handler tests (mocking services).
   - Reference transformation tests.
   - Format-specific tests.
   - Edge case handling.

2. Integration Tests (Less emphasis due to strong unit/E2E)
   - Service cooperation (e.g., SpecLoader + Transformer).

3. E2E Tests
   - Verify server responses for all URI patterns using `mcp-test-helpers`.
   - Test with complex fixtures (`complex-endpoint.json`).
   - Cover success and error scenarios.
   - Test multi-value parameters (`method*`, `name*`).

4. Test Support
   - Type-safe fixtures
   - Reference test helpers
   - Format-specific mocks
   - Validation utilities
