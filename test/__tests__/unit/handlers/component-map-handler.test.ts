import { OpenAPIV3 } from 'openapi-types';
import { RequestId } from '@modelcontextprotocol/sdk/types.js';
import { ComponentMapHandler } from '../../../../src/handlers/component-map-handler';
import { SpecLoaderService } from '../../../../src/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { suppressExpectedConsoleError } from '../../../utils/console-helpers';
import { FormattedResultItem } from '../../../../src/handlers/handler-utils';

// Mocks
const mockGetTransformedSpec = jest.fn();
const mockSpecLoader: SpecLoaderService = {
  getSpec: jest.fn(),
  getTransformedSpec: mockGetTransformedSpec,
};

const mockFormatter: IFormatter = new JsonFormatter(); // Needed for context

// Sample Data
const sampleSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      User: { type: 'object', properties: { name: { type: 'string' } } },
      Error: { type: 'object', properties: { message: { type: 'string' } } },
    },
    parameters: {
      limitParam: { name: 'limit', in: 'query', schema: { type: 'integer' } },
    },
    examples: {}, // Empty type
  },
};

describe('ComponentMapHandler', () => {
  let handler: ComponentMapHandler;

  beforeEach(() => {
    handler = new ComponentMapHandler(mockSpecLoader, mockFormatter);
    mockGetTransformedSpec.mockReset();
    mockGetTransformedSpec.mockResolvedValue(sampleSpec); // Default mock
  });

  it('should return the correct template', () => {
    const template = handler.getTemplate();
    expect(template).toBeInstanceOf(ResourceTemplate);
    expect(template.uriTemplate.toString()).toBe('openapi://components/{type}');
  });

  describe('handleRequest (List Component Names)', () => {
    const mockExtra = {
      signal: new AbortController().signal,
      sendNotification: jest.fn(),
      sendRequest: jest.fn(),
      requestId: 'test-request-id' as RequestId,
    };

    it('should list names for a valid component type (schemas)', async () => {
      const variables: Variables = { type: 'schemas' };
      const uri = new URL('openapi://components/schemas');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(mockGetTransformedSpec).toHaveBeenCalledWith({
        resourceType: 'schema',
        format: 'openapi',
      });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0] as FormattedResultItem;
      expect(content).toMatchObject({
        uri: 'openapi://components/schemas',
        mimeType: 'text/plain',
        isError: false,
      });
      expect(content.text).toContain('Available schemas:');
      expect(content.text).toMatch(/-\sError\n/); // Sorted
      expect(content.text).toMatch(/-\sUser\n/);
      expect(content.text).toContain("Hint: Use 'openapi://components/schemas/{name}'");
    });

    it('should list names for another valid type (parameters)', async () => {
      const variables: Variables = { type: 'parameters' };
      const uri = new URL('openapi://components/parameters');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0] as FormattedResultItem;
      expect(content).toMatchObject({
        uri: 'openapi://components/parameters',
        mimeType: 'text/plain',
        isError: false,
      });
      expect(content.text).toContain('Available parameters:');
      expect(content.text).toMatch(/-\slimitParam\n/);
      expect(content.text).toContain("Hint: Use 'openapi://components/parameters/{name}'");
    });

    it('should handle component type with no components defined (examples)', async () => {
      const variables: Variables = { type: 'examples' };
      const uri = new URL('openapi://components/examples');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/examples',
        mimeType: 'text/plain',
        text: 'No components of type "examples" found.',
        isError: true, // Treat as error because map exists but is empty
      });
    });

    it('should handle component type not present in spec (securitySchemes)', async () => {
      const variables: Variables = { type: 'securitySchemes' };
      const uri = new URL('openapi://components/securitySchemes');
      const expectedLogMessage = /Component type "securitySchemes" not found/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      // Expect the specific error message from getValidatedComponentMap
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/securitySchemes',
        mimeType: 'text/plain',
        text: 'Component type "securitySchemes" not found in the specification. Available types: schemas, parameters, examples',
        isError: true,
      });
    });

    it('should return error for invalid component type', async () => {
      const variables: Variables = { type: 'invalidType' };
      const uri = new URL('openapi://components/invalidType');
      const expectedLogMessage = /Invalid component type: invalidType/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/invalidType',
        mimeType: 'text/plain',
        text: 'Invalid component type: invalidType',
        isError: true,
      });
      expect(mockGetTransformedSpec).not.toHaveBeenCalled(); // Should fail before loading spec
    });

    it('should handle spec loading errors', async () => {
      const error = new Error('Spec load failed');
      mockGetTransformedSpec.mockRejectedValue(error);
      const variables: Variables = { type: 'schemas' };
      const uri = new URL('openapi://components/schemas');
      const expectedLogMessage = /Spec load failed/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/schemas',
        mimeType: 'text/plain',
        text: 'Spec load failed',
        isError: true,
      });
    });

    it('should handle non-OpenAPI v3 spec', async () => {
      const invalidSpec = { swagger: '2.0', info: {} };
      mockGetTransformedSpec.mockResolvedValue(invalidSpec as unknown as OpenAPIV3.Document);
      const variables: Variables = { type: 'schemas' };
      const uri = new URL('openapi://components/schemas');
      const expectedLogMessage = /Only OpenAPI v3 specifications are supported/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/schemas',
        mimeType: 'text/plain',
        text: 'Only OpenAPI v3 specifications are supported',
        isError: true,
      });
    });
  });
});
