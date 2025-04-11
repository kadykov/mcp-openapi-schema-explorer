import { OpenAPIV3 } from 'openapi-types';
import { RenderableDocument } from '../../../../src/rendering/document';
import { RenderContext } from '../../../../src/rendering/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';

// Mock Formatter
const mockFormatter: IFormatter = new JsonFormatter(); // Use JSON for predictable output

const mockContext: RenderContext = {
  formatter: mockFormatter,
  baseUri: 'openapi://',
};

// Sample OpenAPI Document Fixture
const sampleDoc: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/test': {
      get: {
        summary: 'Test GET',
        responses: {
          '200': { description: 'OK' },
        },
      },
    },
  },
  components: {
    schemas: {
      TestSchema: { type: 'string' },
    },
  },
  servers: [{ url: 'http://localhost:3000' }],
};

describe('RenderableDocument', () => {
  let renderableDoc: RenderableDocument;

  beforeEach(() => {
    renderableDoc = new RenderableDocument(sampleDoc);
  });

  it('should instantiate correctly', () => {
    expect(renderableDoc).toBeInstanceOf(RenderableDocument);
  });

  // Test the internal detail rendering method
  describe('renderTopLevelFieldDetail', () => {
    it('should render detail for a valid top-level field (info)', () => {
      const fieldObject = renderableDoc.getTopLevelField('info');
      const result = renderableDoc.renderTopLevelFieldDetail(mockContext, fieldObject, 'info');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'info',
        data: sampleDoc.info, // Expect raw data
        isError: undefined, // Should default to false implicitly
        renderAsList: undefined, // Should default to false implicitly
      });
    });

    it('should render detail for another valid field (servers)', () => {
      const fieldObject = renderableDoc.getTopLevelField('servers');
      const result = renderableDoc.renderTopLevelFieldDetail(mockContext, fieldObject, 'servers');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'servers',
        data: sampleDoc.servers,
        isError: undefined,
        renderAsList: undefined,
      });
    });

    it('should return error for non-existent field', () => {
      const fieldObject = renderableDoc.getTopLevelField('nonexistent');
      const result = renderableDoc.renderTopLevelFieldDetail(
        mockContext,
        fieldObject, // Will be undefined
        'nonexistent'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'nonexistent',
        data: null,
        isError: true,
        errorText: 'Error: Field "nonexistent" not found in the OpenAPI document.',
        renderAsList: true,
      });
    });

    it('should return error when trying to render "paths" via detail method', () => {
      const fieldObject = renderableDoc.getTopLevelField('paths');
      const result = renderableDoc.renderTopLevelFieldDetail(mockContext, fieldObject, 'paths');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'paths',
        data: null,
        isError: true,
        errorText: `Error: Field "paths" should be accessed via its list view (${mockContext.baseUri}paths). Use the list view first.`,
        renderAsList: true,
      });
    });

    it('should return error when trying to render "components" via detail method', () => {
      const fieldObject = renderableDoc.getTopLevelField('components');
      const result = renderableDoc.renderTopLevelFieldDetail(
        mockContext,
        fieldObject,
        'components'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'components',
        data: null,
        isError: true,
        errorText: `Error: Field "components" should be accessed via its list view (${mockContext.baseUri}components). Use the list view first.`,
        renderAsList: true,
      });
    });
  });

  // Test the interface methods (which currently return errors)
  describe('Interface Methods', () => {
    it('renderList should return error', () => {
      const result = renderableDoc.renderList(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uriSuffix: 'error',
        isError: true,
        errorText: expect.stringContaining(
          'List rendering is only supported for specific fields'
        ) as string,
        renderAsList: true,
      });
    });

    it('renderDetail should return error', () => {
      const result = renderableDoc.renderDetail(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uriSuffix: 'error',
        isError: true,
        errorText: expect.stringContaining(
          'Detail rendering requires specifying a top-level field'
        ) as string,
        renderAsList: true,
      });
    });
  });

  // Test helper methods
  describe('Helper Methods', () => {
    it('getPathsObject should return paths', () => {
      expect(renderableDoc.getPathsObject()).toBe(sampleDoc.paths);
    });
    it('getComponentsObject should return components', () => {
      expect(renderableDoc.getComponentsObject()).toBe(sampleDoc.components);
    });
    it('getTopLevelField should return correct field', () => {
      expect(renderableDoc.getTopLevelField('info')).toBe(sampleDoc.info);
      expect(renderableDoc.getTopLevelField('servers')).toBe(sampleDoc.servers);
      expect(renderableDoc.getTopLevelField('nonexistent')).toBeUndefined();
    });
  });
});
