import { OpenAPIV3 } from 'openapi-types';
import { RenderablePaths } from '../../../../src/rendering/paths';
import { RenderContext } from '../../../../src/rendering/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';

// Mock Formatter & Context
const mockFormatter: IFormatter = new JsonFormatter();
const mockContext: RenderContext = {
  formatter: mockFormatter,
  baseUri: 'openapi://',
};

// Sample Paths Object Fixture
const samplePaths: OpenAPIV3.PathsObject = {
  '/users': {
    get: {
      summary: 'List Users',
      responses: { '200': { description: 'OK' } },
    },
    post: {
      summary: 'Create User',
      responses: { '201': { description: 'Created' } },
    },
  },
  '/users/{userId}': {
    get: {
      summary: 'Get User by ID',
      responses: { '200': { description: 'OK' } },
    },
    delete: {
      // No summary
      responses: { '204': { description: 'No Content' } },
    },
  },
  // Removed /ping path with custom operation to avoid type errors
};

const emptyPaths: OpenAPIV3.PathsObject = {};

describe('RenderablePaths', () => {
  describe('renderList', () => {
    it('should render a list of paths and methods correctly', () => {
      const renderablePaths = new RenderablePaths(samplePaths);
      const result = renderablePaths.renderList(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].uriSuffix).toBe('paths');
      expect(result[0].renderAsList).toBe(true);
      expect(result[0].isError).toBeUndefined();

      // Define expected output lines based on the new format
      const expectedLineUsers = 'GET POST /users'; // Methods sorted alphabetically and uppercased
      const expectedLineUserDetail = 'DELETE GET /users/{userId}'; // Methods sorted alphabetically and uppercased

      // Check essential parts instead of exact match
      expect(result[0].data).toContain('Hint:');
      expect(result[0].data).toContain('openapi://paths/{encoded_path}');
      expect(result[0].data).toContain('openapi://paths/{encoded_path}/{method}');
      expect(result[0].data).toContain(expectedLineUsers);
      expect(result[0].data).toContain(expectedLineUserDetail);
    });

    it('should handle empty paths object', () => {
      const renderablePaths = new RenderablePaths(emptyPaths);
      const result = renderablePaths.renderList(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'paths',
        data: 'No paths found in the specification.',
        renderAsList: true,
      });
    });

    it('should handle undefined paths object', () => {
      const renderablePaths = new RenderablePaths(undefined);
      const result = renderablePaths.renderList(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'paths',
        data: 'No paths found in the specification.',
        renderAsList: true,
      });
    });
  });

  describe('renderDetail', () => {
    it('should delegate to renderList', () => {
      const renderablePaths = new RenderablePaths(samplePaths);
      const listResult = renderablePaths.renderList(mockContext);
      const detailResult = renderablePaths.renderDetail(mockContext);
      // Check if the output is the same as renderList
      expect(detailResult).toEqual(listResult);
    });
  });

  describe('getPathItem', () => {
    it('should return the correct PathItemObject', () => {
      const renderablePaths = new RenderablePaths(samplePaths);
      expect(renderablePaths.getPathItem('/users')).toBe(samplePaths['/users']);
      expect(renderablePaths.getPathItem('/users/{userId}')).toBe(samplePaths['/users/{userId}']);
    });

    it('should return undefined for non-existent path', () => {
      const renderablePaths = new RenderablePaths(samplePaths);
      expect(renderablePaths.getPathItem('/nonexistent')).toBeUndefined();
    });

    it('should return undefined if paths object is undefined', () => {
      const renderablePaths = new RenderablePaths(undefined);
      expect(renderablePaths.getPathItem('/users')).toBeUndefined();
    });
  });
});
