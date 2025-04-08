# OpenAPI Schema Explorer MCP Server

## Project Overview
Building an MCP server that allows exploration of OpenAPI specification files in a selective, token-efficient manner.

## Core Requirements
1. Allow loading and exploring OpenAPI spec files without consuming excessive LLM tokens
2. Expose key parts of OpenAPI specs through MCP resources
3. Support local OpenAPI specification files
4. Provide test coverage with Jest

## Future Extensions (Out of Scope)
- Remote OpenAPI specs
- Different specification formats
- Search functionality

## Technical Constraints
- Must be built with TypeScript MCP SDK
- Must be published to npm
- Must have comprehensive tests
- Must be optimized for testability and extensibility

## Project Boundaries
- Initial focus on local OpenAPI spec files only
- Focus on most important parts: endpoints and type definitions
- Real-time spec updates are out of scope (server restart required for updates)
