#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // Ensure McpServer is imported
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';

// Import new handlers
import { TopLevelFieldHandler } from './handlers/top-level-field-handler.js';
import { PathItemHandler } from './handlers/path-item-handler.js';
import { OperationHandler } from './handlers/operation-handler.js';
import { ComponentMapHandler } from './handlers/component-map-handler.js';
import { ComponentDetailHandler } from './handlers/component-detail-handler.js';
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

    // Get the loaded spec to extract the title
    const spec = await specLoader.getSpec();
    const defaultServerName = 'OpenAPI Schema Explorer';
    const serverName = spec.info?.title
      ? `Schema Explorer for ${spec.info.title}`
      : defaultServerName;

    // Create MCP server with dynamic name
    const server = new McpServer({
      name: serverName,
      version: '1.0.0',
    });

    // Set up formatter and new handlers
    const formatter = createFormatter(config.outputFormat);
    const topLevelFieldHandler = new TopLevelFieldHandler(specLoader, formatter);
    const pathItemHandler = new PathItemHandler(specLoader, formatter);
    const operationHandler = new OperationHandler(specLoader, formatter);
    const componentMapHandler = new ComponentMapHandler(specLoader, formatter);
    const componentDetailHandler = new ComponentDetailHandler(specLoader, formatter);

    // Register new resources
    // 1. openapi://{field}
    server.resource(
      'openapi-field', // Unique ID for the resource registration
      topLevelFieldHandler.getTemplate(),
      {
        // MimeType varies (text/plain for lists, JSON/YAML for details) - SDK might handle this? Or maybe set a default? Let's omit for now.
        description:
          'Access top-level fields (info, servers, tags), list paths, or list component types.',
        name: 'OpenAPI Field/List', // Generic name
      },
      topLevelFieldHandler.handleRequest
    );

    // 2. openapi://paths/{path}
    server.resource(
      'openapi-path-methods',
      pathItemHandler.getTemplate(),
      {
        mimeType: 'text/plain', // This always returns a list
        description: 'List available HTTP methods for a specific path.',
        name: 'Path Methods List',
      },
      pathItemHandler.handleRequest
    );

    // 3. openapi://paths/{path}/{method*}
    server.resource(
      'openapi-operation-detail',
      operationHandler.getTemplate(),
      {
        mimeType: formatter.getMimeType(), // Detail view uses formatter
        description: 'Get details for one or more specific API operations (methods).',
        name: 'Operation Detail',
      },
      operationHandler.handleRequest
    );

    // 4. openapi://components/{type}
    server.resource(
      'openapi-component-list',
      componentMapHandler.getTemplate(),
      {
        mimeType: 'text/plain', // This always returns a list
        description: 'List available components of a specific type (e.g., schemas, parameters).',
        name: 'Component List',
      },
      componentMapHandler.handleRequest
    );

    // 5. openapi://components/{type}/{name*}
    server.resource(
      'openapi-component-detail',
      componentDetailHandler.getTemplate(),
      {
        mimeType: formatter.getMimeType(), // Detail view uses formatter
        description: 'Get details for one or more specific components (e.g., schemas, parameters).',
        name: 'Component Detail',
      },
      componentDetailHandler.handleRequest
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
