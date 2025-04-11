import { OpenAPIV3 } from 'openapi-types';
import { PathItemHandler } from '../../../../src/handlers/path-item-handler';
import { SpecLoaderService } from '../../../../src/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';

// Mocks
const mockGetTransformedSpec = jest.fn();
const mockSpecLoader: SpecLoaderService = {
  getSpec: jest.fn(),
  getTransformedSpec: mockGetTransformedSpec,
};

const mockFormatter: IFormatter = new JsonFormatter(); // Needed for context

// Sample Data
const samplePathItem: OpenAPIV3.PathItemObject = {
  get: { summary: 'Get Item', responses: { '200': { description: 'OK' } } },
  post: { summary: 'Create Item', responses: { '201': { description: 'Created' } } },
};
const sampleSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/items': samplePathItem,
    '/empty': {}, // Path with no methods
  },
  components: {},
};

const encodedPathItems = encodeURIComponent('items');
const encodedPathEmpty = encodeURIComponent('empty');
const encodedPathNonExistent = encodeURIComponent('nonexistent');

describe('PathItemHandler', () => {
  let handler: PathItemHandler;

  beforeEach(() => {
    handler = new PathItemHandler(mockSpecLoader, mockFormatter);
    mockGetTransformedSpec.mockReset();
    mockGetTransformedSpec.mockResolvedValue(sampleSpec); // Default mock
  });

  it('should return the correct template', () => {
    const template = handler.getTemplate();
    expect(template).toBeInstanceOf(ResourceTemplate);
    expect(template.uriTemplate.toString()).toBe('openapi://paths/{path}');
  });

  describe('handleRequest (List Methods)', () => {
    const mockExtra = { signal: new AbortController().signal };

    it('should list methods for a valid path', async () => {
      const variables: Variables = { path: encodedPathItems };
      const uri = new URL(`openapi://paths/${encodedPathItems}`);

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(mockGetTransformedSpec).toHaveBeenCalledWith({
        resourceType: 'schema',
        format: 'openapi',
      });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: `openapi://paths/${encodedPathItems}`,
        mimeType: 'text/plain',
        isError: false,
      });
      // Check for hint first, then methods
      expect(result.contents[0].text).toContain("Hint: Use 'openapi://paths/items/{method}'");
      expect(result.contents[0].text).toContain('GET: Get Item');
      expect(result.contents[0].text).toContain('POST: Create Item');
      // Ensure the old "Methods for..." header is not present if hint is first
      expect(result.contents[0].text).not.toContain('Methods for items:');
    });

    it('should handle path with no methods', async () => {
      const variables: Variables = { path: encodedPathEmpty };
      const uri = new URL(`openapi://paths/${encodedPathEmpty}`);

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathEmpty}`,
        mimeType: 'text/plain',
        text: 'No standard HTTP methods found for path: empty',
        isError: false, // Not an error, just no methods
      });
    });

    it('should return error for non-existent path', async () => {
      const variables: Variables = { path: encodedPathNonExistent };
      const uri = new URL(`openapi://paths/${encodedPathNonExistent}`);

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathNonExistent}`,
        mimeType: 'text/plain',
        text: 'Path item not found.',
        isError: true,
      });
    });

    it('should handle spec loading errors', async () => {
      const error = new Error('Spec load failed');
      mockGetTransformedSpec.mockRejectedValue(error);
      const variables: Variables = { path: encodedPathItems };
      const uri = new URL(`openapi://paths/${encodedPathItems}`);

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathItems}`,
        mimeType: 'text/plain',
        text: 'Spec load failed',
        isError: true,
      });
    });

    it('should handle non-OpenAPI v3 spec', async () => {
      const invalidSpec = { swagger: '2.0', info: {} };
      mockGetTransformedSpec.mockResolvedValue(invalidSpec as unknown as OpenAPIV3.Document);
      const variables: Variables = { path: encodedPathItems };
      const uri = new URL(`openapi://paths/${encodedPathItems}`);

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathItems}`,
        mimeType: 'text/plain',
        text: 'Only OpenAPI v3 specifications are supported',
        isError: true,
      });
    });
  });
});
