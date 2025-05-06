import { OpenAPIV3 } from 'openapi-types';
import { RequestId } from '@modelcontextprotocol/sdk/types.js';
import { TopLevelFieldHandler } from '../../../../src/handlers/top-level-field-handler';
import { SpecLoaderService } from '../../../../src/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { suppressExpectedConsoleError } from '../../../utils/console-helpers';

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
    const mockExtra = {
      signal: new AbortController().signal,
      sendNotification: jest.fn(),
      sendRequest: jest.fn(),
      requestId: 'test-request-id' as RequestId,
    };

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
      // Match the core error message using RegExp
      const expectedLogMessage = /Failed to load spec/;

      // Use the helper, letting TypeScript infer the return type
      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

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
      // Match the core error message using RegExp
      const expectedLogMessage = /Only OpenAPI v3 specifications are supported/;

      // Use the helper, letting TypeScript infer the return type
      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

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
