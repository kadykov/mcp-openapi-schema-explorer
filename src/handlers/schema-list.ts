import { ReadResourceCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import { SpecLoaderService } from '../types.js';

function isOpenAPIV3(spec: OpenAPI.Document): spec is OpenAPIV3.Document {
  // Simple check for the 'openapi' field, assuming it's v3 if present
  return 'openapi' in spec;
}

export class SchemaListHandler {
  constructor(private specLoader: SpecLoaderService) {}

  /**
   * Handle resource request for schema list
   * Returns a text/plain list of schema names in a token-efficient format
   */
  handleRequest: ReadResourceCallback = async (uri: URL, _extra: { signal: AbortSignal }) => {
    try {
      const spec = await this.specLoader.getSpec();
      if (!isOpenAPIV3(spec)) {
        return {
          contents: [
            {
              uri: uri.href,
              text: 'Error: Only OpenAPI v3 specifications are supported',
              mimeType: 'text/plain',
              isError: true,
            },
          ],
        };
      }

      // Extract schema names from components.schemas
      const schemaNames = Object.keys(spec.components?.schemas || {});

      // Sort names alphabetically for consistent output
      const sortedNames = schemaNames.sort();

      return {
        contents: [
          {
            uri: uri.href,
            text: sortedNames.join('\n'),
            mimeType: 'text/plain',
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            mimeType: 'text/plain',
            isError: true,
          },
        ],
      };
    }
  };
}
