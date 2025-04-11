import { OpenAPIV3 } from 'openapi-types';
import { RenderablePathItem } from '../../../../src/rendering/path-item';
import { RenderContext } from '../../../../src/rendering/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';

// Mock Formatter & Context
const mockFormatter: IFormatter = new JsonFormatter();
const mockContext: RenderContext = {
  formatter: mockFormatter,
  baseUri: 'openapi://',
};

// Sample PathItem Object Fixture
const samplePathItem: OpenAPIV3.PathItemObject = {
  get: {
    summary: 'Get Item',
    responses: { '200': { description: 'OK' } },
  },
  post: {
    summary: 'Create Item',
    responses: { '201': { description: 'Created' } },
  },
  delete: {
    // No summary
    responses: { '204': { description: 'No Content' } },
  },
  parameters: [
    // Example path-level parameter
    { name: 'commonParam', in: 'query', schema: { type: 'string' } },
  ],
};

const pathUriSuffix = 'paths/items';

describe('RenderablePathItem', () => {
  describe('renderList (List Methods)', () => {
    it('should render a list of methods correctly', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      const result = renderable.renderList(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].uriSuffix).toBe(pathUriSuffix);
      expect(result[0].renderAsList).toBe(true);
      expect(result[0].isError).toBeUndefined();

      // Define expected output lines based on the new format
      const expectedHint =
        "Hint: Use 'openapi://paths/items/{method}' to view details for a specific operation."; // Updated hint text
      const expectedLineDelete = 'DELETE'; // No summary/opId
      const expectedLineGet = 'GET: Get Item'; // Summary exists
      const expectedLinePost = 'POST: Create Item'; // Summary exists
      const expectedOutput = `${expectedHint}\n\n${expectedLineDelete}\n${expectedLineGet}\n${expectedLinePost}`;

      // Check the full output string
      expect(result[0].data).toBe(expectedOutput);
    });

    it('should handle path item with no standard methods', () => {
      const noMethodsPathItem: OpenAPIV3.PathItemObject = {
        parameters: samplePathItem.parameters,
      };
      const renderable = new RenderablePathItem(noMethodsPathItem, pathUriSuffix);
      const result = renderable.renderList(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: pathUriSuffix,
        data: 'No standard HTTP methods found for path: items',
        renderAsList: true,
      });
    });

    it('should return error if path item is undefined', () => {
      const renderable = new RenderablePathItem(undefined, pathUriSuffix);
      const result = renderable.renderList(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uriSuffix: pathUriSuffix,
        isError: true,
        errorText: 'Path item not found.',
        renderAsList: true,
      });
    });
  });

  describe('renderOperationDetail (Get Operation Detail)', () => {
    it('should return detail for a single valid method', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      const result = renderable.renderOperationDetail(mockContext, ['get']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: `${pathUriSuffix}/get`,
        data: samplePathItem.get, // Expect raw operation object
      });
    });

    it('should return details for multiple valid methods', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      const result = renderable.renderOperationDetail(mockContext, ['post', 'delete']);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        uriSuffix: `${pathUriSuffix}/post`,
        data: samplePathItem.post,
      });
      expect(result).toContainEqual({
        uriSuffix: `${pathUriSuffix}/delete`,
        data: samplePathItem.delete,
      });
    });

    it('should return error for non-existent method', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      const result = renderable.renderOperationDetail(mockContext, ['put']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: `${pathUriSuffix}/put`,
        data: null,
        isError: true,
        errorText: 'Method "PUT" not found for path.',
        renderAsList: true,
      });
    });

    it('should handle mix of valid and invalid methods', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      const result = renderable.renderOperationDetail(mockContext, ['get', 'patch']);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        uriSuffix: `${pathUriSuffix}/get`,
        data: samplePathItem.get,
      });
      expect(result).toContainEqual({
        uriSuffix: `${pathUriSuffix}/patch`,
        data: null,
        isError: true,
        errorText: 'Method "PATCH" not found for path.',
        renderAsList: true,
      });
    });

    it('should return error if path item is undefined', () => {
      const renderable = new RenderablePathItem(undefined, pathUriSuffix);
      const result = renderable.renderOperationDetail(mockContext, ['get']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: `${pathUriSuffix}/get`,
        data: null,
        isError: true,
        errorText: 'Path item not found.',
        renderAsList: true,
      });
    });
  });

  describe('renderDetail (Interface Method)', () => {
    it('should delegate to renderList', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      const listResult = renderable.renderList(mockContext);
      const detailResult = renderable.renderDetail(mockContext);
      expect(detailResult).toEqual(listResult);
    });
  });

  describe('getOperation', () => {
    it('should return correct operation object (case-insensitive)', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      expect(renderable.getOperation('get')).toBe(samplePathItem.get);
      expect(renderable.getOperation('POST')).toBe(samplePathItem.post);
      expect(renderable.getOperation('Delete')).toBe(samplePathItem.delete);
    });

    it('should return undefined for non-existent method', () => {
      const renderable = new RenderablePathItem(samplePathItem, pathUriSuffix);
      expect(renderable.getOperation('put')).toBeUndefined();
    });

    it('should return undefined if path item is undefined', () => {
      const renderable = new RenderablePathItem(undefined, pathUriSuffix);
      expect(renderable.getOperation('get')).toBeUndefined();
    });
  });
});
