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
    });
  }

  /**
   * Handle resource request for endpoint details
   */
  handleRequest: ReadResourceTemplateCallback = async (uri: URL, variables: Variables) => {
    // Get method and path from variables
    const methodValue = Array.isArray(variables.method) ? variables.method[0] : variables.method;
    const encodedPath = Array.isArray(variables.path) ? variables.path[0] : variables.path;
    const decodedPath = '/' + decodeURIComponent(encodedPath || '');

    if (!methodValue || !isValidHttpMethod(methodValue)) {
      throw new Error(`Invalid HTTP method: ${methodValue}`);
    }

    // Get operation from OpenAPI spec
    const spec = await Promise.resolve(this.specLoader.getSpec());
    const operation = getPathOperation(spec, decodedPath, methodValue);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              method: methodValue.toUpperCase(),
              path: decodedPath,
              ...operation,
            },
            null,
            2
          ),
        },
      ],
    };
  };
}
