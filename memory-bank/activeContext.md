# Active Context

## Current Focus

Completed major refactoring of resource handling and URI structure.

## Recent Progress (Major Refactor - ✓)

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

- New architecture with separate rendering and handling layers is in place.
- Server successfully serves resources based on the new URI structure.
- Core functionality (listing/detailing paths, operations, components, top-level fields) is working.
- Unit tests cover rendering logic; E2E tests cover basic resource access.

## Next Actions / Immediate Focus

1.  **Handler Unit Tests:** Implement comprehensive unit tests for each handler class (`TopLevelFieldHandler`, `PathItemHandler`, etc.), mocking `SpecLoaderService` and `IFormatter`.
2.  **Refactor Helpers:** Consolidate duplicated helper functions (`formatResults`, `isOpenAPIV3`) fully into `handler-utils.ts` and remove from individual handlers.
3.  **Code Cleanup:** Address remaining TODOs and minor ESLint warnings (e.g., `any` types in tests where acceptable).
4.  **Memory Bank Review:** Ensure all Memory Bank files accurately reflect the current state after this large refactor.

## Future Considerations (Post Immediate Actions)

- Implement `complete` callbacks for resource templates.
- Implement reference traversal/resolution service.
- Enhance support for all component types.
