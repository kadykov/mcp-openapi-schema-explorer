# OpenAPI Schema Explorer MCP Server

## Project Overview
Building an MCP server that allows exploration of OpenAPI specification files in a selective, token-efficient manner.

## Core Requirements (✓)
1. Allow loading and exploring OpenAPI spec files without consuming excessive LLM tokens
   - Token-efficient plain text listings
   - JSON format for detailed views
   - Error handling without excessive details
2. Expose key parts of OpenAPI specs through MCP resources
   - Endpoint details with full operation info
   - Multiple values support for batch operations
   - Resource completion support
3. Support local OpenAPI specification files
   - OpenAPI v3.0 support
   - Local file loading
   - Error handling for invalid specs
4. Provide test coverage with Jest
   - Full unit test coverage
   - E2E test coverage
   - Type-safe test implementation

## Future Extensions (Out of Scope)
- Remote OpenAPI specs
- Different specification formats
- Search functionality

## Technical Constraints (✓)
- Built with TypeScript MCP SDK
- Published to npm
- Comprehensive test coverage
- Optimized for testability and extensibility

## Project Boundaries
- Initial focus on local OpenAPI spec files only
- Focus on most important parts: endpoints and type definitions
- Real-time spec updates are out of scope (server restart required for updates)

## Next Optimizations
- YAML output format for improved token efficiency
- $ref resolution using URI links
- Parameter validation implementation
- Enhanced documentation support
