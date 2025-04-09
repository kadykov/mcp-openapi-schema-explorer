import { EndpointHandler } from '../../../../src/handlers/endpoint.js';
import { OpenAPIV3 } from 'openapi-types';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';

interface ApiResponse {
  method: string;
  path: string;
  summary: string;
  responses: OpenAPIV3.ResponsesObject;
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

    it('throws error for non-existent path', async () => {
      const uri = new URL('openapi://endpoint/get/wrong%2Fpath');
      const variables: Variables = {
        method: 'get',
        path: 'wrong%2Fpath',
      };

      await expect(handler.handleRequest(uri, variables, { signal: abortSignal })).rejects.toThrow(
        'Path not found: /wrong/path'
      );
    });

    it('throws error for non-existent method', async () => {
      const uri = new URL('openapi://endpoint/post/test%2Fpath');
      const variables: Variables = {
        method: 'post',
        path: 'test%2Fpath',
      };

      await expect(handler.handleRequest(uri, variables, { signal: abortSignal })).rejects.toThrow(
        'Method post not found for path: /test/path'
      );
    });
  });
});
