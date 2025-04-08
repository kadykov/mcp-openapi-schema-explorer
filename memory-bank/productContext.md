# Product Context

## Problem Statement
When working with large OpenAPI specifications, loading the entire spec into an LLM's context:
1. Consumes excessive tokens
2. May confuse the LLM with too much information
3. Makes it difficult to focus on specific parts of the API

## Solution
An MCP server that:
1. Loads OpenAPI specs from local files
2. Provides selective access to specific parts of the spec
3. Returns information in a token-efficient format
4. Makes it easy for LLMs to explore and understand API structure

## User Experience Goals
1. Easy installation via npm
2. Simple configuration with local spec file path
3. Intuitive resource URIs for exploring API parts
4. Clear and consistent response formats

## Usage Workflow
1. User installs MCP server via npm
2. User configures server with path to OpenAPI spec file
3. LLM can explore API structure efficiently through exposed resources
4. Server restarts required for spec file updates
