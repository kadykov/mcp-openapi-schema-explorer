#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { EndpointHandler } from './handlers/endpoint.js';
import { EndpointListHandler } from './handlers/endpoint-list.js';
import { SchemaHandler } from './handlers/schema.js'; // Import SchemaHandler
import { OpenAPITransformer, ReferenceTransformService } from './services/reference-transform.js';
import { SpecLoaderService } from './services/spec-loader.js';
import { createFormatter } from './services/formatters.js';

async function main(): Promise<void> {
  try {
    // Get spec path and options from command line arguments
    const [, , specPath, ...args] = process.argv;
    const options = {
      outputFormat: args.includes('--output-format')
        ? args[args.indexOf('--output-format') + 1]
        : undefined,
    };

    // Load configuration
    const config = loadConfig(specPath, options);

    // Initialize services
    const referenceTransform = new ReferenceTransformService();
    referenceTransform.registerTransformer('openapi', new OpenAPITransformer());

    const specLoader = new SpecLoaderService(config.specPath, referenceTransform);
    await specLoader.loadSpec();

    // Create MCP server
    const server = new McpServer({
      name: 'openapi-explorer',
      version: '1.0.0',
    });

    // Set up handlers
    const formatter = createFormatter(config.outputFormat);
    const endpointHandler = new EndpointHandler(specLoader, formatter);
    const endpointListHandler = new EndpointListHandler(specLoader);
    const schemaHandler = new SchemaHandler(specLoader, formatter); // Instantiate SchemaHandler

    // Add endpoint details resource
    const endpointTemplate = endpointHandler.getTemplate(); // Rename variable
    server.resource(
      'endpoint',
      endpointTemplate, // Use renamed variable
      {
        mimeType: formatter.getMimeType(),
        description: 'OpenAPI endpoint details',
        name: 'endpoint',
      },
      (uri, variables, extra) => endpointHandler.handleRequest(uri, variables, extra)
    );

    // Add endpoint list resource
    server.resource(
      'endpoints-list',
      'openapi://endpoints/list',
      {
        mimeType: 'text/plain',
        description: 'List of all OpenAPI endpoints',
        name: 'endpoints-list',
      },
      endpointListHandler.handleRequest
    );

    // Add schema details resource
    const schemaTemplate = schemaHandler.getTemplate();
    server.resource(
      'schema',
      schemaTemplate,
      {
        mimeType: formatter.getMimeType(), // Use same formatter for consistency
        description: 'OpenAPI schema details',
        name: 'schema',
      },
      (uri, variables, extra) => schemaHandler.handleRequest(uri, variables, extra)
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
