import {
  ReadResourceTemplateCallback,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import { SpecLoaderService } from '../types.js';
import { IFormatter } from '../services/formatters.js';

function isOpenAPIV3(spec: OpenAPI.Document): spec is OpenAPIV3.Document {
  // Re-using helper from endpoint.ts, consider moving to a shared utils file later
  return 'openapi' in spec;
}

// Helper function similar to endpoint handler to create a map of schemas
function createSchemasMap(
  spec: OpenAPIV3.Document
): Map<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> {
  const schemasMap = new Map<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>();
  if (spec.components?.schemas) {
    Object.entries(spec.components.schemas).forEach(([name, schema]) => {
      schemasMap.set(name, schema);
    });
  }
  return schemasMap;
}

export class SchemaHandler {
  constructor(
    private specLoader: SpecLoaderService,
    private formatter: IFormatter
  ) {}

  /**
   * Get resource template for schemas
   */
  getTemplate(): ResourceTemplate {
    // Using {name*} to allow multiple schema names in a single request
    return new ResourceTemplate('openapi://schema/{name*}', {
      list: undefined, // No list operation defined for individual schemas
      complete: undefined, // No specific completion needed for schema names yet
    });
  }

  /**
   * Get details for a single schema component
   */
  private getSchemaDetails(
    spec: OpenAPI.Document,
    encodedName: string
  ): OpenAPIV3.SchemaObject | { name: string; error: string } {
    if (!isOpenAPIV3(spec)) {
      // Consistent error handling with endpoint.ts
      throw new Error('Only OpenAPI v3 specifications are supported');
    }

    const decodedName = decodeURIComponent(encodedName || '');
    // Adjust type to potentially include ReferenceObject from the lookup

    // Use the Map for safe access
    const schemasMap = createSchemasMap(spec);
    const schema = schemasMap.get(decodedName);

    if (!schema) {
      // Return an error object if schema not found
      return {
        name: decodedName,
        error: `Schema not found: ${decodedName}`,
      };
    }

    // Check if the retrieved item is unexpectedly a ReferenceObject
    if (typeof schema === 'object' && schema !== null && '$ref' in schema) {
      return {
        name: decodedName,
        error: `Unexpected reference found for schema: ${decodedName}. Expected resolved schema.`,
      };
    }

    // Type is now narrowed to SchemaObject | undefined | null.
    // Since we checked !schema above, it must be SchemaObject here.
    // Remove unnecessary assertion.
    return schema;
  }

  /**
   * Handle resource request for schema details
   */
  handleRequest: ReadResourceTemplateCallback = async (uri: URL, variables: Variables) => {
    try {
      // Get schema name(s) from variables. Handle both single string and array.
      const names = Array.isArray(variables.name) ? variables.name : [variables.name];

      // Get transformed OpenAPI spec. Pass context if needed by loader.
      const spec = await this.specLoader.getTransformedSpec({
        resourceType: 'schema',
        format: 'openapi', // Assuming openapi format for now
      });

      // Generate responses for all requested schema names
      return {
        contents: names.map(name => {
          const schemaDetails = this.getSchemaDetails(spec, name);
          const isError = 'error' in schemaDetails;
          return {
            // Use the original encoded name in the URI
            uri: `openapi://schema/${name}`,
            mimeType: this.formatter.getMimeType(),
            text: this.formatter.format(schemaDetails),
            // Indicate if the specific schema lookup resulted in an error
            isError: isError,
          };
        }),
      };
    } catch (error) {
      // Catch errors during spec loading or other unexpected issues
      return {
        contents: [
          {
            uri: uri.href, // Use the original request URI for top-level errors
            mimeType: 'text/plain',
            text:
              error instanceof Error ? error.message : 'Unknown error processing schema request',
            isError: true,
          },
        ],
      };
    }
  };
}
