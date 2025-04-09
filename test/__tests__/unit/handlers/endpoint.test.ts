import { EndpointHandler } from '../../../../src/handlers/endpoint.js';
import { OpenAPIV3 } from 'openapi-types';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';

interface ApiResponse {
  method: string;
  path: string;
  summary: string;
  responses: OpenAPIV3.ResponsesObject;
}

interface ApiErrorResponse {
  method: string;
  path: string;
  error: string;
}

type OperationResponse = ApiResponse | ApiErrorResponse;

function isApiErrorResponse(obj: unknown): obj is ApiErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ApiErrorResponse).method === 'string' &&
    typeof (obj as ApiErrorResponse).path === 'string' &&
    typeof (obj as ApiErrorResponse).error === 'string'
  );
}

type ResourceTextContent = {
  uri: string;
  mimeType: string;
  text: string;
};

function isResourceTextContent(content: unknown): content is ResourceTextContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'text' in content &&
    typeof (content as ResourceTextContent).text === 'string'
  );
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response');
  }
}

function isApiResponse(obj: unknown): obj is ApiResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ApiResponse).method === 'string' &&
    typeof (obj as ApiResponse).path === 'string' &&
    typeof (obj as ApiResponse).summary === 'string' &&
    typeof (obj as ApiResponse).responses === 'object'
  );
}

describe('EndpointHandler', () => {
  let handler: EndpointHandler;
  let mockSpecLoader: { getSpec: jest.Mock };
  let abortSignal: AbortSignal;

  beforeEach(() => {
    mockSpecLoader = {
      getSpec: jest.fn(),
    };
    handler = new EndpointHandler(mockSpecLoader);
    abortSignal = new AbortController().signal;
  });

  describe('getTemplate', () => {
    it('returns resource template for endpoint URLs', () => {
      const template = handler.getTemplate();
      expect(template).toBeDefined();
      // Just verify that we get a ResourceTemplate instance
      expect(template.constructor.name).toBe('ResourceTemplate');
    });
  });

  describe('handleRequest', () => {
    const mockOperation: OpenAPIV3.OperationObject = {
      summary: 'Test Operation',
      responses: {
        '200': {
          description: 'Success',
        },
      },
    };

    const mockSpec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/test/path': {
          get: mockOperation,
        },
      },
    };

    beforeEach(() => {
      mockSpecLoader.getSpec.mockReturnValue(mockSpec);
    });

    it('returns formatted operation details for valid endpoint', async () => {
      const uri = new URL('openapi://endpoint/get/test%2Fpath');
      const variables: Variables = {
        method: 'get',
        path: 'test%2Fpath',
      };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('application/json');
      expect(content.uri).toBe(uri.href);

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const parsedJson = parseJsonSafely(content.text);
      if (!isApiResponse(parsedJson)) {
        throw new Error('Invalid API response format');
      }

      expect(parsedJson).toEqual({
        method: 'GET',
        path: '/test/path',
        summary: 'Test Operation',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      });
    });

    it('returns multiple operations when method is an array', async () => {
      mockSpecLoader.getSpec.mockReturnValue({
        ...mockSpec,
        paths: {
          '/test/path': {
            get: mockOperation,
            post: {
              ...mockOperation,
              summary: 'Create Operation',
            },
          },
        },
      });

      const uri = new URL('openapi://endpoint/get,post/test%2Fpath');
      const variables: Variables = {
        method: ['get', 'post'],
        path: 'test%2Fpath',
      };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('application/json');

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const parsedJson = parseJsonSafely(content.text) as OperationResponse[];
      expect(parsedJson).toHaveLength(2);
      expect(parsedJson[0]).toEqual({
        method: 'GET',
        path: '/test/path',
        summary: 'Test Operation',
        responses: {
          '200': { description: 'Success' },
        },
      });
      expect(parsedJson[1]).toEqual({
        method: 'POST',
        path: '/test/path',
        summary: 'Create Operation',
        responses: {
          '200': { description: 'Success' },
        },
      });
    });

    it('handles multiple paths with multiple methods', async () => {
      mockSpecLoader.getSpec.mockReturnValue({
        ...mockSpec,
        paths: {
          '/test/path1': {
            get: mockOperation,
          },
          '/test/path2': {
            post: {
              ...mockOperation,
              summary: 'Create Operation',
            },
          },
        },
      });

      const uri = new URL('openapi://endpoint/get,post/test%2Fpath1,test%2Fpath2');
      const variables: Variables = {
        method: ['get', 'post'],
        path: ['test%2Fpath1', 'test%2Fpath2'],
      };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('application/json');

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const parsedJson = parseJsonSafely(content.text) as OperationResponse[];
      expect(parsedJson).toHaveLength(4);

      // Success cases
      const successOperations = parsedJson.filter(isApiResponse);
      expect(
        successOperations.find(op => op.method === 'GET' && op.path === '/test/path1')
      ).toBeDefined();
      expect(
        successOperations.find(op => op.method === 'POST' && op.path === '/test/path2')
      ).toBeDefined();

      // Error cases (with error property)
      const errorOperations = parsedJson.filter(isApiErrorResponse);
      const notFoundPost = errorOperations.find(
        op => op.method === 'POST' && op.path === '/test/path1'
      );
      expect(notFoundPost?.error).toBe('Method post not found for path: /test/path1');

      const notFoundGet = errorOperations.find(
        op => op.method === 'GET' && op.path === '/test/path2'
      );
      expect(notFoundGet?.error).toBe('Method get not found for path: /test/path2');
    });

    it('returns error for non-existent path', async () => {
      const uri = new URL('openapi://endpoint/get/wrong%2Fpath');
      const variables: Variables = {
        method: 'get',
        path: 'wrong%2Fpath',
      };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });
      const content = result.contents[0];

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const parsedJson = parseJsonSafely(content.text) as OperationResponse;
      expect(isApiErrorResponse(parsedJson)).toBe(true);
      expect((parsedJson as ApiErrorResponse).error).toBe('Path not found: /wrong/path');
    });

    it('returns error for non-existent method', async () => {
      const uri = new URL('openapi://endpoint/post/test%2Fpath');
      const variables: Variables = {
        method: 'post',
        path: 'test%2Fpath',
      };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });
      const content = result.contents[0];

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const parsedJson = parseJsonSafely(content.text) as OperationResponse;
      expect(isApiErrorResponse(parsedJson)).toBe(true);
      expect((parsedJson as ApiErrorResponse).error).toBe(
        'Method post not found for path: /test/path'
      );
    });

    it('normalizes paths with multiple leading slashes', async () => {
      const uri = new URL('openapi://endpoint/get/%2F%2Ftest%2Fpath');
      const variables: Variables = {
        method: 'get',
        path: '%2F%2Ftest%2Fpath',
      };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const parsedJson = parseJsonSafely(content.text);
      if (!isApiResponse(parsedJson)) {
        throw new Error('Invalid API response format');
      }

      // Should normalize to a single leading slash
      expect(parsedJson.path).toBe('/test/path');
    });
  });
});
