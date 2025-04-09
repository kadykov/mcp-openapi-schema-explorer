import {
  ReadResourceTemplateCallback,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import { SpecLoaderService } from '../types.js';

function isOpenAPIV3(spec: OpenAPI.Document): spec is OpenAPIV3.Document {
  return 'openapi' in spec;
}

export class EndpointListHandler {
  constructor(private specLoader: SpecLoaderService) {}

  /**
   * Get resource template for endpoint list
   */
  getTemplate(): ResourceTemplate {
    return new ResourceTemplate('openapi://endpoints/list', {
      list: undefined,
    });
  }

  /**
   * Handle resource request for endpoint list
   * Returns a text/plain list of endpoints in a token-efficient format
   */
  handleRequest: ReadResourceTemplateCallback = async (uri: URL) => {
    try {
      const spec = await Promise.resolve(this.specLoader.getSpec());
      if (!isOpenAPIV3(spec)) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: 'Error: Only OpenAPI v3 specifications are supported',
              isError: true,
            },
          ],
        };
      }

      // Build token-efficient list of endpoints
      const lines: string[] = [];

      for (const [path, pathItem] of Object.entries(spec.paths || {})) {
        if (!pathItem) continue;

        // Collect all methods for this path
        const methods = Object.keys(pathItem)
          .filter((key): key is keyof OpenAPIV3.PathItemObject => {
            return ['get', 'post', 'put', 'delete', 'patch'].includes(key);
          })
          .map(method => method.toUpperCase());

        if (methods.length > 0) {
          lines.push(`${methods.join(' ')} ${path}`);
        }
      }

      // Sort lines for consistent output and join with newline
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: lines.sort().join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isError: true,
          },
        ],
      };
    }
  };
}
