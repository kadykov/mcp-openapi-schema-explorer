#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'; // Import ResourceTemplate
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OpenAPI } from 'openapi-types'; // Import OpenAPIV3 as well
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
import { isOpenAPIV3, getValidatedComponentMap } from './handlers/handler-utils.js'; // Import type guard and helper
import { VERSION } from './version.js'; // Import the generated version

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
      version: VERSION, // Use the imported version
    });

    // Set up formatter and new handlers
    const formatter = createFormatter(config.outputFormat);
    const topLevelFieldHandler = new TopLevelFieldHandler(specLoader, formatter);
    const pathItemHandler = new PathItemHandler(specLoader, formatter);
    const operationHandler = new OperationHandler(specLoader, formatter);
    const componentMapHandler = new ComponentMapHandler(specLoader, formatter);
    const componentDetailHandler = new ComponentDetailHandler(specLoader, formatter);

    // --- Define Resource Templates and Register Handlers ---

    // Helper to get dynamic field list for descriptions
    const getFieldList = (): string => Object.keys(transformedSpec).join(', ');
    // Helper to get dynamic component type list for descriptions
    const getComponentTypeList = (): string => {
      if (isOpenAPIV3(transformedSpec) && transformedSpec.components) {
        return Object.keys(transformedSpec.components).join(', ');
      }
      return ''; // Return empty if no components or not V3
    };

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
        // MimeType varies (text/plain for lists, JSON/YAML for details)
        description: `Access top-level fields like ${getFieldList()}. (e.g., openapi://info)`,
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
        description:
          'List methods for a specific path (URL encode paths with slashes). (e.g., openapi://paths/users%2F%7Bid%7D)',
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
        description:
          'Get details for one or more operations (comma-separated). (e.g., openapi://paths/users%2F%7Bid%7D/get,post)',
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
        description: `List components of a specific type like ${getComponentTypeList()}. (e.g., openapi://components/schemas)`,
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
        name: (): string[] => {
          // Provide names only if there's exactly one component type defined
          if (
            isOpenAPIV3(transformedSpec) &&
            transformedSpec.components &&
            Object.keys(transformedSpec.components).length === 1
          ) {
            // Get the single component type key (e.g., 'schemas')
            const componentTypeKey = Object.keys(transformedSpec.components)[0];
            // Use the helper to safely get the map
            try {
              const componentTypeMap = getValidatedComponentMap(transformedSpec, componentTypeKey);
              return Object.keys(componentTypeMap);
            } catch (error) {
              // Should not happen if key came from Object.keys, but handle defensively
              console.error(`Error getting component map for key ${componentTypeKey}:`, error);
              return [];
            }
          }
          // Otherwise, return no completions for name
          return [];
        },
      },
    });
    server.resource(
      'openapi-component-detail',
      componentDetailTemplate,
      {
        mimeType: formatter.getMimeType(), // Detail view uses formatter
        description:
          'Get details for one or more components (comma-separated). (e.g., openapi://components/schemas/User,Task)',
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
