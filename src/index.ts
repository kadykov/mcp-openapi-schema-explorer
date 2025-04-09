#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { createSpecLoader } from './services/spec-loader.js';
import { EndpointHandler } from './handlers/endpoint.js';

async function main(): Promise<void> {
  try {
    // Get spec path from command line argument
    const specPath = process.argv[2];

    // Load configuration
    const config = loadConfig(specPath);

    // Initialize spec loader
    const specLoader = await createSpecLoader(config.specPath);

    // Create MCP server
    const server = new McpServer({
      name: 'openapi-explorer',
      version: '1.0.0',
    });

    // Set up handlers
    const endpointHandler = new EndpointHandler(specLoader);
    const template = endpointHandler.getTemplate();

    server.resource(
      'endpoint',
      template,
      {
        mimeType: 'application/json',
        description: 'OpenAPI endpoint details',
        name: 'endpoint',
      },
      (uri, variables, extra) => endpointHandler.handleRequest(uri, variables, extra)
    );

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error(
      'Failed to start server:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run the server
main().catch(error => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
