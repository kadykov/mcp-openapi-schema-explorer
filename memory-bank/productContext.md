# Product Context

## Problem Statement
When working with large OpenAPI specifications, loading the entire spec into an LLM's context:
1. Consumes excessive tokens due to fully resolved references
2. May confuse the LLM with too much information
3. Makes it difficult to focus on specific parts of the API
4. Duplicates schema information across multiple endpoints

## Solution
An MCP server that:
1. Loads OpenAPI specs from local files
2. Transforms references to token-efficient URIs
3. Provides selective access to specific parts of the spec
4. Returns information in a token-efficient format
5. Makes it easy for LLMs to explore API structures
6. Supports different specification formats

## User Experience Goals
1. Easy installation via npm
2. Simple configuration with local spec file path
3. Intuitive resource URIs for exploring API parts
4. Clear and consistent response formats

## Usage Workflow
1. User installs MCP server via npm
2. User configures server with path to specification file
3. Server loads and transforms spec references
4. LLM explores API structure through exposed resources:
   - Endpoints with URI references to schemas
   - Schema details through URI resolution
   - Token-efficient listing formats
5. Server restarts required for spec file updates
