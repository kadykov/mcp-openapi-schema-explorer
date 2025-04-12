#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'; // Import ResourceTemplate
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OpenAPI } from 'openapi-types'; // Import OpenAPI namespace
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
import { encodeUriPathComponent } from './utils/uri-builder.js'; // Import specific function
import { isOpenAPIV3 } from './handlers/handler-utils.js'; // Import type guard

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
    const spec: OpenAPI.Document = await specLoader.getSpec(); // Rename back to spec
    // Get the transformed spec for use in completions
    const transformedSpec: OpenAPI.Document = await specLoader.getTransformedSpec({
      resourceType: 'schema', // Use a default context
      format: 'openapi',
    });
    const defaultServerName = 'OpenAPI Schema Explorer';
    // Use original spec for title
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
    const fieldTemplate = new ResourceTemplate('openapi://{field}', {
      list: undefined, // List is handled by the handler logic based on field value
      complete: {
        field: (): string[] => Object.keys(transformedSpec), // Use transformedSpec
      },
    });
    server.resource(
      'openapi-field', // Unique ID for the resource registration
      fieldTemplate,
      {
        // MimeType varies (text/plain for lists, JSON/YAML for details) - SDK might handle this? Or maybe set a default? Let's omit for now.
        description:
          'Access top-level fields (info, servers, tags), list paths, or list component types.',
        name: 'OpenAPI Field/List', // Generic name
      },
      topLevelFieldHandler.handleRequest
    );

    // 2. openapi://paths/{path}
    const pathTemplate = new ResourceTemplate('openapi://paths/{path}', {
      list: undefined, // List is handled by the handler
      complete: {
        path: (): string[] => Object.keys(transformedSpec.paths ?? {}).map(encodeUriPathComponent), // Use imported function directly
      },
    });
    server.resource(
      'openapi-path-methods',
      pathTemplate,
      {
        mimeType: 'text/plain', // This always returns a list
        description: 'List available HTTP methods for a specific path.',
        name: 'Path Methods List',
      },
      pathItemHandler.handleRequest
    );

    // 3. openapi://paths/{path}/{method*}
    const operationTemplate = new ResourceTemplate('openapi://paths/{path}/{method*}', {
      list: undefined, // Detail view handled by handler
      complete: {
        path: (): string[] => Object.keys(transformedSpec.paths ?? {}).map(encodeUriPathComponent), // Use imported function directly
        method: (): string[] => [
          // Provide static list of common methods
          'GET',
          'POST',
          'PUT',
          'DELETE',
          'PATCH',
          'OPTIONS',
          'HEAD',
          'TRACE',
        ],
      },
    });
    server.resource(
      'openapi-operation-detail',
      operationTemplate,
      {
        mimeType: formatter.getMimeType(), // Detail view uses formatter
        description: 'Get details for one or more specific API operations (methods).',
        name: 'Operation Detail',
      },
      operationHandler.handleRequest
    );

    // 4. openapi://components/{type}
    const componentMapTemplate = new ResourceTemplate('openapi://components/{type}', {
      list: undefined, // List is handled by the handler
      complete: {
        type: (): string[] => {
          // Use type guard to ensure spec is V3 before accessing components
          if (isOpenAPIV3(transformedSpec)) {
            return Object.keys(transformedSpec.components ?? {});
          }
          return []; // Return empty array if not V3 (shouldn't happen ideally)
        },
      },
    });
    server.resource(
      'openapi-component-list',
      componentMapTemplate,
      {
        mimeType: 'text/plain', // This always returns a list
        description: 'List available components of a specific type (e.g., schemas, parameters).',
        name: 'Component List',
      },
      componentMapHandler.handleRequest
    );

    // 5. openapi://components/{type}/{name*}
    const componentDetailTemplate = new ResourceTemplate('openapi://components/{type}/{name*}', {
      list: undefined, // Detail view handled by handler
      complete: {
        type: (): string[] => {
          // Use type guard to ensure spec is V3 before accessing components
          if (isOpenAPIV3(transformedSpec)) {
            return Object.keys(transformedSpec.components ?? {});
          }
          return []; // Return empty array if not V3
        },
        // Omit 'name' to indicate no completion is available
      },
    });
    server.resource(
      'openapi-component-detail',
      componentDetailTemplate,
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
