import { SchemaListHandler } from '../../../../src/handlers/schema-list.js';
import { OpenAPIV3 } from 'openapi-types';
import { SpecLoaderService } from '../../../../src/services/spec-loader.js';
import { ReferenceTransformService } from '../../../../src/services/reference-transform.js';

type ResourceTextContent = {
  uri: string;
  mimeType: string;
  text: string;
  isError?: boolean; // Added isError for completeness
};

function isResourceTextContent(content: unknown): content is ResourceTextContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'text' in content &&
    typeof (content as ResourceTextContent).text === 'string' &&
    'mimeType' in content &&
    typeof (content as ResourceTextContent).mimeType === 'string' &&
    'uri' in content &&
    typeof (content as ResourceTextContent).uri === 'string'
  );
}

describe('SchemaListHandler', () => {
  let handler: SchemaListHandler;
  let mockSpecLoader: jest.Mocked<SpecLoaderService>;

  beforeEach(() => {
    // Mock SpecLoaderService dependencies
    const transform = new ReferenceTransformService(); // Real instance might be okay here if not complex
    const loader = new SpecLoaderService('/test.json', transform);

    // Create a Jest mock from the loader instance
    mockSpecLoader = jest.mocked(loader, { shallow: true }); // Use shallow mock

    // Mock methods used by the handler
    mockSpecLoader.getSpec = jest.fn().mockResolvedValue({} as OpenAPIV3.Document);
    // Add mocks for other methods if they were called, e.g., getTransformedSpec, loadSpec
    // mockSpecLoader.getTransformedSpec = jest.fn().mockResolvedValue({} as OpenAPIV3.Document);
    // mockSpecLoader.loadSpec = jest.fn().mockResolvedValue({} as OpenAPIV3.Document);

    handler = new SchemaListHandler(mockSpecLoader);
  });

  describe('handleRequest', () => {
    const mockSchemaObject: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    };

    const mockSpec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {}, // Paths are not relevant for schema list
      components: {
        schemas: {
          Task: mockSchemaObject,
          Project: mockSchemaObject,
          Article: mockSchemaObject,
        },
      },
    };

    beforeEach(() => {
      // Reset mock before each test in the describe block
      mockSpecLoader.getSpec.mockResolvedValue(mockSpec);
    });

    it('returns formatted schema list in text/plain format, sorted alphabetically', async () => {
      const uri = new URL('openapi://schemas/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.uri).toBe(uri.href);
      expect(content.isError).toBeUndefined(); // Should not be an error

      if (!isResourceTextContent(content)) {
        throw new Error('Expected text content in response');
      }

      const lines = content.text.split('\n');
      // Expect sorted order
      expect(lines).toEqual(['Article', 'Project', 'Task']);
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

      const uri = new URL('openapi://schemas/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.isError).toBe(true);
      expect(content.text).toBe('Error: Only OpenAPI v3 specifications are supported');
    });

    it('returns empty result for spec with no components.schemas', async () => {
      mockSpecLoader.getSpec.mockResolvedValue({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {}, // No schemas object
      });

      const uri = new URL('openapi://schemas/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.isError).toBeUndefined();
      expect(content.text).toBe('');
    });

    it('returns empty result for spec with empty components.schemas', async () => {
      mockSpecLoader.getSpec.mockResolvedValue({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {}, // Empty schemas object
        },
      });

      const uri = new URL('openapi://schemas/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.isError).toBeUndefined();
      expect(content.text).toBe('');
    });

    it('handles errors during spec loading', async () => {
      const loadError = new Error('Failed to load spec');
      mockSpecLoader.getSpec.mockRejectedValue(loadError);

      const uri = new URL('openapi://schemas/list');
      const result = await handler.handleRequest(uri, { signal: new AbortController().signal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/plain');
      expect(content.isError).toBe(true);
      expect(content.text).toBe(`Error: ${loadError.message}`);
    });
  });
});
