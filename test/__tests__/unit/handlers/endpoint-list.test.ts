import { EndpointListHandler } from '../../../../src/handlers/endpoint-list.js';
import { OpenAPIV3 } from 'openapi-types';
import { SpecLoaderService } from '../../../../src/services/spec-loader.js';
import { ReferenceTransformService } from '../../../../src/services/reference-transform.js';

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

describe('EndpointListHandler', () => {
  let handler: EndpointListHandler;
  let mockSpecLoader: jest.Mocked<SpecLoaderService>;

  beforeEach(() => {
    const transform = new ReferenceTransformService();
    const loader = new SpecLoaderService('/test.json', transform);
    mockSpecLoader = jest.mocked(loader, { shallow: true });
    mockSpecLoader.getSpec = jest.fn().mockResolvedValue({} as OpenAPIV3.Document);
    mockSpecLoader.getTransformedSpec = jest.fn().mockResolvedValue({} as OpenAPIV3.Document);
    mockSpecLoader.loadSpec = jest.fn().mockResolvedValue({} as OpenAPIV3.Document);
    handler = new EndpointListHandler(mockSpecLoader);
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
        '/api/v1/organizations/{orgId}/projects/{projectId}/tasks': {
          get: mockOperation,
          post: mockOperation,
        },
      },
    };

    beforeEach(() => {
      mockSpecLoader.getSpec.mockResolvedValue(mockSpec);
    });

    it('returns formatted endpoint list in text/plain format', async () => {
      const uri = new URL('openapi://endpoints/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.uri).toBe(uri.href);

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const lines = content.text.split('\n');
      expect(lines).toEqual(['GET POST /api/v1/organizations/{orgId}/projects/{projectId}/tasks']);
    });

    it('returns error for non-OpenAPI v3 spec', async () => {
      mockSpecLoader.getSpec.mockResolvedValue({
        swagger: '2.0', // OpenAPI 2.0
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      });

      const uri = new URL('openapi://endpoints/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.isError).toBe(true);
      expect(content.text).toBe('Error: Only OpenAPI v3 specifications are supported');
    });

    it('returns empty result for spec with no paths', async () => {
      mockSpecLoader.getSpec.mockResolvedValue({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      });

      const uri = new URL('openapi://endpoints/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.text).toBe('');
    });

    it('handles paths without valid methods', async () => {
      mockSpecLoader.getSpec.mockResolvedValue({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/test': {
            // Only has parameters, no methods
            parameters: [],
          },
        },
      });

      const uri = new URL('openapi://endpoints/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.text).toBe('');
    });
  });
});
