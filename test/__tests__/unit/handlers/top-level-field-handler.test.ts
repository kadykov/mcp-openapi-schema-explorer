import { OpenAPIV3 } from 'openapi-types';
import { TopLevelFieldHandler } from '../../../../src/handlers/top-level-field-handler';
import { SpecLoaderService } from '../../../../src/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';

// Mocks
const mockGetTransformedSpec = jest.fn();
const mockSpecLoader: SpecLoaderService = {
  getSpec: jest.fn(), // Not used by this handler directly
  getTransformedSpec: mockGetTransformedSpec,
};

const mockFormatter: IFormatter = new JsonFormatter(); // Use real formatter for structure check

// Sample Data
const sampleSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.1.0' },
  paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } },
  components: { schemas: { Test: { type: 'string' } } },
  servers: [{ url: 'http://example.com' }],
};

describe('TopLevelFieldHandler', () => {
  let handler: TopLevelFieldHandler;

  beforeEach(() => {
    handler = new TopLevelFieldHandler(mockSpecLoader, mockFormatter);
    mockGetTransformedSpec.mockReset(); // Reset mock before each test
  });

  it('should return the correct template', () => {
    const template = handler.getTemplate();
    expect(template).toBeInstanceOf(ResourceTemplate);
    // Compare against the string representation of the UriTemplate object
    expect(template.uriTemplate.toString()).toBe('openapi://{field}');
  });

  describe('handleRequest', () => {
    // Create a mock extra object with the required signal property
    const mockExtra = {
      signal: new AbortController().signal,
    };
    // Cast to the expected type for the handler call signature if needed,
    // but the object structure itself is simpler.
    // Note: We might need to cast this later if strict type checks complain,
    // but let's try the minimal structure first.

    it('should handle request for "info" field', async () => {
      mockGetTransformedSpec.mockResolvedValue(sampleSpec);
      const variables: Variables = { field: 'info' };
      const uri = new URL('openapi://info');

      // Pass the mock extra object as the third argument
      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(mockGetTransformedSpec).toHaveBeenCalledWith({
        resourceType: 'schema',
        format: 'openapi',
      });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://info',
        mimeType: 'application/json',
        text: JSON.stringify(sampleSpec.info, null, 2),
        isError: false,
      });
    });

    it('should handle request for "servers" field', async () => {
      mockGetTransformedSpec.mockResolvedValue(sampleSpec);
      const variables: Variables = { field: 'servers' };
      const uri = new URL('openapi://servers');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://servers',
        mimeType: 'application/json',
        text: JSON.stringify(sampleSpec.servers, null, 2),
        isError: false,
      });
    });

    it('should handle request for "paths" field (list view)', async () => {
      mockGetTransformedSpec.mockResolvedValue(sampleSpec);
      const variables: Variables = { field: 'paths' };
      const uri = new URL('openapi://paths');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('openapi://paths');
      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].isError).toBe(false);
      expect(result.contents[0].text).toContain('GET /test'); // Check content format
      // Check that the hint contains the essential URI patterns
      expect(result.contents[0].text).toContain('Hint:');
      expect(result.contents[0].text).toContain('openapi://paths/{encoded_path}');
      expect(result.contents[0].text).toContain('openapi://paths/{encoded_path}/{method}');
    });

    it('should handle request for "components" field (list view)', async () => {
      mockGetTransformedSpec.mockResolvedValue(sampleSpec);
      const variables: Variables = { field: 'components' };
      const uri = new URL('openapi://components');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('openapi://components');
      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].isError).toBe(false);
      expect(result.contents[0].text).toContain('- schemas'); // Check content format
      expect(result.contents[0].text).toContain("Hint: Use 'openapi://components/{type}'");
    });

    it('should return error for non-existent field', async () => {
      mockGetTransformedSpec.mockResolvedValue(sampleSpec);
      const variables: Variables = { field: 'nonexistent' };
      const uri = new URL('openapi://nonexistent');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://nonexistent',
        mimeType: 'text/plain',
        text: 'Error: Field "nonexistent" not found in the OpenAPI document.',
        isError: true,
      });
    });

    it('should handle spec loading errors', async () => {
      const error = new Error('Failed to load spec');
      mockGetTransformedSpec.mockRejectedValue(error);
      const variables: Variables = { field: 'info' };
      const uri = new URL('openapi://info');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://info',
        mimeType: 'text/plain',
        text: 'Failed to load spec',
        isError: true,
      });
    });

    it('should handle non-OpenAPI v3 spec', async () => {
      const invalidSpec = { swagger: '2.0', info: {} }; // Not OpenAPI v3
      mockGetTransformedSpec.mockResolvedValue(invalidSpec as unknown as OpenAPIV3.Document);
      const variables: Variables = { field: 'info' };
      const uri = new URL('openapi://info');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://info',
        mimeType: 'text/plain',
        text: 'Only OpenAPI v3 specifications are supported',
        isError: true,
      });
    });
  });
});
