# Technical Context

## Development Stack

- TypeScript for implementation
- MCP SDK for server functionality
- Jest for testing
- npm for package distribution

## Key Dependencies

- `@modelcontextprotocol/sdk`: Core MCP functionality
- `swagger2openapi`: OpenAPI/Swagger spec loading, parsing, and v2->v3 conversion (Runtime dependency)
- `js-yaml`: YAML parsing (Runtime dependency)
- `zod`: Schema validation (Runtime dependency)
- `openapi-types`: OpenAPI type definitions (devDependency)
- `typescript`: TypeScript compiler (devDependency)
- `@types/*`: Various type definitions (devDependencies)
- `jest`: Testing framework (devDependency)
- `eslint`: Code linting (devDependency)
- `prettier`: Code formatting (devDependency)
- `semantic-release` & plugins (`@semantic-release/*`): Automated releases (devDependencies)
- `just`: Task runner (Used locally, installed via action in CI)

## Technical Requirements

1. Must follow MCP protocol specifications.
2. Must handle large OpenAPI/Swagger specs efficiently.
3. Must provide type-safe reference handling (transforming internal refs to MCP URIs).
4. Must support loading specs from local file paths and remote HTTP/HTTPS URLs.
5. Must support OpenAPI v3.0 and Swagger v2.0 formats (with v2.0 being converted to v3.0).
6. Must be easily testable and maintainable.

## Development Environment

- TypeScript setup with strict type checking
- Jest testing framework with coverage
- ESLint for code quality
- Prettier for code formatting
- `just` task runner (`justfile`) for common development tasks (build, test, lint, etc.)
- Conventional Commits standard for commit messages (required for `semantic-release`)
- Test fixtures and helpers

## Code Organization

- Services layer:
  - `SpecLoaderService`: Uses `swagger2openapi` to load specs from files/URLs and handle v2->v3 conversion.
  - `ReferenceTransformService`: Transforms internal `#/components/...` refs to MCP URIs.
  - `Formatters`: Handle JSON/YAML output.
- Handlers layer for resource endpoints.
- Rendering layer for generating resource content.
- Utilities (e.g., URI builder).
- Strong typing with generics.
- Comprehensive test coverage.

## Testing Infrastructure

- Unit tests:
  - `SpecLoaderService` (mocking `swagger2openapi`).
  - `ReferenceTransformService`.
  - Rendering classes.
  - Handlers (mocking services).
- End-to-end tests:
  - Verify resource access for local v3, local v2, and remote v3 specs.
  - Test multi-value parameters.
  - Cover success and error scenarios.
  - Verify resource completion logic using `client.complete()`.
- Type-safe test utilities (`mcp-test-helpers`).
- Test fixtures (including v2.0 and v3.0 examples).
- Coverage reporting via Jest and upload to Codecov via GitHub Actions.
- CI Integration (`.github/workflows/ci.yml`):
  - Runs checks (`just all`, `just security`, CodeQL) on pushes/PRs to `main`.
  - Uses Node 22 environment.

## Response Formats

1. Base Formats

   - JSON format (default format)
   - YAML format support
   - URI-based reference links
   - Token-efficient structure
   - OpenAPI v3 type compliance

2. Format Service

   - Pluggable formatter architecture
   - Format-specific MIME types (`application/json`, `text/yaml`)
   - Type-safe formatter interface (`IFormatter`)
   - Consistent error formatting (`text/plain`)
   - CLI-configurable output format (`--output-format`)

3. Implementation
   - Format-specific serialization
   - Shared type system
   - Error response handling
   - Multiple operation support
   - Reference transformation

## Deployment / Release Process

- Automated publishing to npm via `semantic-release` triggered by pushes to `main` branch in GitHub Actions.
- Relies on Conventional Commits to determine version bumps.
- Creates version tags (e.g., `v1.2.3`) and GitHub Releases automatically.
- Requires `NPM_TOKEN` secret configured in GitHub repository for publishing.
- `CHANGELOG.md` is automatically generated and updated.
- Server version is dynamically set at runtime based on the release version.

## Configuration

- Command-line argument based configuration (`src/config.ts`).
- Single required argument: `<path-or-url-to-spec>`.
- Optional argument: `--output-format <json|yaml|json-minified>`.
- Required argument validation.
- TypeScript type safety (`ServerConfig` interface).
- Error handling for missing/invalid arguments.

## Error Handling

- Descriptive error messages
- Type-safe error handling
- Consistent error format
- Proper error propagation

## Future Extensions

- AsyncAPI format support
- GraphQL schema support
- External reference resolution
- Enhanced schema resources
- Reference validation
