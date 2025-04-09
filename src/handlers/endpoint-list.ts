import { ReadResourceCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import { SpecLoaderService } from '../types.js';

function isOpenAPIV3(spec: OpenAPI.Document): spec is OpenAPIV3.Document {
  return 'openapi' in spec;
}

export class EndpointListHandler {
  constructor(private specLoader: SpecLoaderService) {}

  /**
   * Handle resource request for endpoint list
   * Returns a text/plain list of endpoints in a token-efficient format
   */
  handleRequest: ReadResourceCallback = async (uri: URL, _extra: { signal: AbortSignal }) => {
    try {
      const spec = await this.specLoader.getSpec(); // Already returns a Promise, no need for Promise.resolve
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

      // Sort lines for consistent output
      return {
        contents: [
          {
            uri: uri.href,
            text: lines.sort().join('\n'),
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
