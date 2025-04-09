import { EndpointHandler } from '../../../../src/handlers/endpoint.js';
import { OpenAPIV3 } from 'openapi-types';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { SpecLoaderService } from '../../../../src/services/spec-loader.js';
import { JsonFormatter, YamlFormatter } from '../../../../src/services/formatters.js';

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

  describe('with JSON formatter', () => {
    let handler: EndpointHandler;
    let mockSpecLoader: jest.Mocked<SpecLoaderService>;
    let abortSignal: AbortSignal;

    beforeEach(() => {
      mockSpecLoader = {
        getSpec: jest.fn().mockResolvedValue({} as OpenAPIV3.Document),
        getTransformedSpec: jest.fn().mockResolvedValue(mockSpec),
        loadSpec: jest.fn().mockResolvedValue({} as OpenAPIV3.Document),
      } as unknown as jest.Mocked<SpecLoaderService>;
      handler = new EndpointHandler(mockSpecLoader, new JsonFormatter());
      abortSignal = new AbortController().signal;
    });

    it('returns resource template for endpoint URLs', () => {
      const template = handler.getTemplate();
      expect(template).toBeDefined();
      expect(template.constructor.name).toBe('ResourceTemplate');
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
      expect(content.mimeType).toBe(new JsonFormatter().getMimeType());
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
      mockSpecLoader.getTransformedSpec.mockResolvedValue({
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

      expect(result.contents).toHaveLength(2);

      const getContent = result.contents[0];
      expect(getContent.uri).toBe('openapi://endpoint/get/test%2Fpath');
      expect(getContent.mimeType).toBe('application/json');

      if (!isResourceTextContent(getContent)) {
        throw new Error('Expected text content in GET response');
      }

      const getOperation = parseJsonSafely(getContent.text) as ApiResponse;
      expect(getOperation).toEqual({
        method: 'GET',
        path: '/test/path',
        summary: 'Test Operation',
        responses: {
          '200': { description: 'Success' },
        },
      });

      const postContent = result.contents[1];
      expect(postContent.uri).toBe('openapi://endpoint/post/test%2Fpath');
      expect(postContent.mimeType).toBe('application/json');

      if (!isResourceTextContent(postContent)) {
        throw new Error('Expected text content in POST response');
      }

      const postOperation = parseJsonSafely(postContent.text) as ApiResponse;
      expect(postOperation).toEqual({
        method: 'POST',
        path: '/test/path',
        summary: 'Create Operation',
        responses: {
          '200': { description: 'Success' },
        },
      });
    });

    it('handles multiple paths with multiple methods', async () => {
      mockSpecLoader.getTransformedSpec.mockResolvedValue({
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

      expect(result.contents).toHaveLength(4);

      // GET /test/path1 - should succeed
      const getPath1Content = result.contents.find(
        c => c.uri === 'openapi://endpoint/get/test%2Fpath1'
      );
      expect(getPath1Content).toBeDefined();
      expect(getPath1Content?.mimeType).toBe('application/json');
      if (getPath1Content && isResourceTextContent(getPath1Content)) {
        const operation = parseJsonSafely(getPath1Content.text) as ApiResponse;
        expect(operation).toEqual({
          method: 'GET',
          path: '/test/path1',
          summary: 'Test Operation',
          responses: { '200': { description: 'Success' } },
        });
      }

      // POST /test/path2 - should succeed
      const postPath2Content = result.contents.find(
        c => c.uri === 'openapi://endpoint/post/test%2Fpath2'
      );
      expect(postPath2Content).toBeDefined();
      expect(postPath2Content?.mimeType).toBe('application/json');
      if (postPath2Content && isResourceTextContent(postPath2Content)) {
        const operation = parseJsonSafely(postPath2Content.text) as ApiResponse;
        expect(operation).toEqual({
          method: 'POST',
          path: '/test/path2',
          summary: 'Create Operation',
          responses: { '200': { description: 'Success' } },
        });
      }

      // POST /test/path1 - should fail
      const postPath1Content = result.contents.find(
        c => c.uri === 'openapi://endpoint/post/test%2Fpath1'
      );
      expect(postPath1Content).toBeDefined();
      expect(postPath1Content?.mimeType).toBe('application/json');
      if (postPath1Content && isResourceTextContent(postPath1Content)) {
        const operation = parseJsonSafely(postPath1Content.text) as ApiErrorResponse;
        expect(operation.error).toBe('Method post not found for path: /test/path1');
      }

      // GET /test/path2 - should fail
      const getPath2Content = result.contents.find(
        c => c.uri === 'openapi://endpoint/get/test%2Fpath2'
      );
      expect(getPath2Content).toBeDefined();
      expect(getPath2Content?.mimeType).toBe('application/json');
      if (getPath2Content && isResourceTextContent(getPath2Content)) {
        const operation = parseJsonSafely(getPath2Content.text) as ApiErrorResponse;
        expect(operation.error).toBe('Method get not found for path: /test/path2');
      }
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

  describe('with YAML formatter', () => {
    let handler: EndpointHandler;
    let mockSpecLoader: jest.Mocked<SpecLoaderService>;
    let abortSignal: AbortSignal;

    beforeEach(() => {
      mockSpecLoader = {
        getSpec: jest.fn().mockResolvedValue({} as OpenAPIV3.Document),
        getTransformedSpec: jest.fn().mockResolvedValue(mockSpec),
        loadSpec: jest.fn().mockResolvedValue({} as OpenAPIV3.Document),
      } as unknown as jest.Mocked<SpecLoaderService>;
      handler = new EndpointHandler(mockSpecLoader, new YamlFormatter());
      abortSignal = new AbortController().signal;
    });

    it('returns YAML formatted operation details', async () => {
      mockSpecLoader.getTransformedSpec.mockResolvedValue({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/test/path': {
            get: {
              summary: 'Test Operation',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      });

      const uri = new URL('openapi://endpoint/get/test%2Fpath');
      const variables: Variables = {
        method: 'get',
        path: 'test%2Fpath',
      };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe(new YamlFormatter().getMimeType());
      expect(content.uri).toBe(uri.href);

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      // YAML content ends with a newline
      expect(content.text).toMatch(/\n$/);
      // Should contain typical YAML markers
      expect(content.text).toContain('method: GET');
      expect(content.text).toContain('path: /test/path');
      expect(content.text).toContain('summary: Test Operation');
    });
  });
});
