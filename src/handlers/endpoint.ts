import {
  ReadResourceTemplateCallback,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import { HttpMethod, SpecLoaderService } from '../types.js';

function isValidHttpMethod(method: string): method is HttpMethod {
  return ['get', 'put', 'post', 'delete', 'patch'].includes(method.toLowerCase());
}

function isOpenAPIV3(spec: OpenAPI.Document): spec is OpenAPIV3.Document {
  return 'openapi' in spec;
}

function createPathsMap(spec: OpenAPIV3.Document): Map<string, OpenAPIV3.PathItemObject> {
  const pathsMap = new Map<string, OpenAPIV3.PathItemObject>();
  if (spec.paths) {
    Object.entries(spec.paths).forEach(([path, item]) => {
      pathsMap.set(path, item as OpenAPIV3.PathItemObject);
    });
  }
  return pathsMap;
}

function createOperationsMap(
  pathItem: OpenAPIV3.PathItemObject
): Map<HttpMethod, OpenAPIV3.OperationObject> {
  const operationsMap = new Map<HttpMethod, OpenAPIV3.OperationObject>();
  Object.entries(pathItem).forEach(([method, operation]) => {
    if (isValidHttpMethod(method)) {
      operationsMap.set(method, operation as OpenAPIV3.OperationObject);
    }
  });
  return operationsMap;
}

function getPathOperation(
  spec: OpenAPI.Document,
  path: string,
  method: HttpMethod
): OpenAPIV3.OperationObject {
  if (!isOpenAPIV3(spec)) {
    throw new Error('Only OpenAPI v3 specifications are supported');
  }

  const pathsMap = createPathsMap(spec);
  const pathItem = pathsMap.get(path);

  if (!pathItem) {
    throw new Error(`Path not found: ${path}`);
  }

  const operationsMap = createOperationsMap(pathItem);
  const operation = operationsMap.get(method);

  if (!operation) {
    throw new Error(`Method ${method} not found for path: ${path}`);
  }

  return operation;
}

export class EndpointHandler {
  constructor(private specLoader: SpecLoaderService) {}

  /**
   * Get resource template for endpoints
   */
  getTemplate(): ResourceTemplate {
    return new ResourceTemplate('openapi://endpoint/{method}/{path}', {
      list: undefined,
      complete: {
        // Provide completion for HTTP methods
        method: () => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
    });
  }

  /**
   * Get details for a single operation
   */
  private getOperationDetails(
    spec: OpenAPI.Document,
    method: string,
    encodedPath: string
  ): OpenAPIV3.OperationObject & { method: string; path: string } {
    if (!method || !isValidHttpMethod(method)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }

    const decodedPath = '/' + decodeURIComponent(encodedPath || '').replace(/^\/+/, '');
    const operation = getPathOperation(spec, decodedPath, method.toLowerCase() as HttpMethod);

    return {
      method: method.toUpperCase(),
      path: decodedPath,
      ...operation,
    };
  }

  /**
   * Handle resource request for endpoint details
   */
  handleRequest: ReadResourceTemplateCallback = async (uri: URL, variables: Variables) => {
    try {
      // Get method(s) and path(s) from variables
      const methods = Array.isArray(variables.method) ? variables.method : [variables.method];
      const paths = Array.isArray(variables.path) ? variables.path : [variables.path];

      // Get the OpenAPI spec
      const spec = await Promise.resolve(this.specLoader.getSpec());

      // Generate all combinations of methods and paths
      const operations = paths.flatMap(path =>
        methods.map(method => {
          try {
            return this.getOperationDetails(spec, method, path);
          } catch (error) {
            return {
              method: method.toUpperCase(),
              path: '/' + decodeURIComponent(path || '').replace(/^\/+/, ''),
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(operations.length === 1 ? operations[0] : operations, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: error instanceof Error ? error.message : 'Unknown error',
            isError: true,
          },
        ],
      };
    }
  };
}
