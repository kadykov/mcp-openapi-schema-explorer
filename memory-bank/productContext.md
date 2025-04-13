# Product Context

## Problem Statement

When working with large OpenAPI specifications, loading the entire spec into an LLM's context:

1. Consumes excessive tokens due to fully resolved references
2. May confuse the LLM with too much information
3. Makes it difficult to focus on specific parts of the API
4. Duplicates schema information across multiple endpoints

## Solution

An MCP server that:

1. Loads OpenAPI v3.0 and Swagger v2.0 specs from local files or remote URLs.
2. Automatically converts Swagger v2.0 specs to OpenAPI v3.0.
3. Transforms internal references (`#/components/...`) to token-efficient MCP URIs.
4. Provides selective access to specific parts of the spec via MCP resources.
5. Returns information in token-efficient formats (text lists, JSON/YAML details).
6. Makes it easy for LLMs to explore API structures without loading the entire spec.

## User Experience Goals

1. Easy installation/usage via npm (`npx`) or Docker.
2. Simple configuration via a single command-line argument (path or URL).
3. Intuitive resource URIs for exploring API parts.
4. Clear and consistent response formats.

## Usage Workflow

1. User configures the server in their MCP client using either:
   - `npx mcp-openapi-schema-explorer <path-or-url-to-spec> [options]` (Recommended for most users)
   - `docker run kadykov/mcp-openapi-schema-explorer:latest <path-or-url-to-spec> [options]` (Requires Docker, local files need volume mounting)
   - Global installation (`npm i -g ...` then `mcp-openapi-schema-explorer ...`) (Less common)
2. Server loads the spec (from file or URL), converts v2.0 to v3.0 if necessary, and transforms internal references to MCP URIs.
3. LLM explores API structure through exposed resources:
   - List paths, components, methods.
   - View details for info, operations, components, etc.
   - Follow transformed reference URIs (`openapi://components/...`) to view component details without loading the whole spec initially.
4. Server restarts required if the source specification file/URL content changes.
