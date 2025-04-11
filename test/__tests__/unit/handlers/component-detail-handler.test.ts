import { OpenAPIV3 } from 'openapi-types';
import { ComponentDetailHandler } from '../../../../src/handlers/component-detail-handler';
import { SpecLoaderService } from '../../../../src/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { suppressExpectedConsoleError } from '../../../utils/console-helpers';

// Mocks
const mockGetTransformedSpec = jest.fn();
const mockSpecLoader: SpecLoaderService = {
  getSpec: jest.fn(),
  getTransformedSpec: mockGetTransformedSpec,
};

const mockFormatter: IFormatter = new JsonFormatter();

// Sample Data
const userSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: { name: { type: 'string' } },
};
const errorSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: { message: { type: 'string' } },
};
const limitParam: OpenAPIV3.ParameterObject = {
  name: 'limit',
  in: 'query',
  schema: { type: 'integer' },
};

const sampleSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      User: userSchema,
      Error: errorSchema,
    },
    parameters: {
      limitParam: limitParam,
    },
    // No securitySchemes defined
  },
};

describe('ComponentDetailHandler', () => {
  let handler: ComponentDetailHandler;

  beforeEach(() => {
    handler = new ComponentDetailHandler(mockSpecLoader, mockFormatter);
    mockGetTransformedSpec.mockReset();
    mockGetTransformedSpec.mockResolvedValue(sampleSpec); // Default mock
  });

  it('should return the correct template', () => {
    const template = handler.getTemplate();
    expect(template).toBeInstanceOf(ResourceTemplate);
    expect(template.uriTemplate.toString()).toBe('openapi://components/{type}/{name*}');
  });

  describe('handleRequest', () => {
    const mockExtra = { signal: new AbortController().signal };

    it('should return detail for a single valid component (schema)', async () => {
      const variables: Variables = { type: 'schemas', name: 'User' }; // Use 'name' key
      const uri = new URL('openapi://components/schemas/User');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(mockGetTransformedSpec).toHaveBeenCalledWith({
        resourceType: 'schema',
        format: 'openapi',
      });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/schemas/User',
        mimeType: 'application/json',
        text: JSON.stringify(userSchema, null, 2),
        isError: false,
      });
    });

    it('should return detail for a single valid component (parameter)', async () => {
      const variables: Variables = { type: 'parameters', name: 'limitParam' };
      const uri = new URL('openapi://components/parameters/limitParam');

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/parameters/limitParam',
        mimeType: 'application/json',
        text: JSON.stringify(limitParam, null, 2),
        isError: false,
      });
    });

    it('should return details for multiple valid components (array input)', async () => {
      const variables: Variables = { type: 'schemas', name: ['User', 'Error'] }; // Use 'name' key with array
      const uri = new URL('openapi://components/schemas/User,Error'); // URI might not reflect array input

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(2);
      expect(result.contents).toContainEqual({
        uri: 'openapi://components/schemas/User',
        mimeType: 'application/json',
        text: JSON.stringify(userSchema, null, 2),
        isError: false,
      });
      expect(result.contents).toContainEqual({
        uri: 'openapi://components/schemas/Error',
        mimeType: 'application/json',
        text: JSON.stringify(errorSchema, null, 2),
        isError: false,
      });
    });

    it('should return error for invalid component type', async () => {
      const variables: Variables = { type: 'invalidType', name: 'SomeName' };
      const uri = new URL('openapi://components/invalidType/SomeName');
      const expectedLogMessage = /Invalid component type: invalidType/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/invalidType/SomeName',
        mimeType: 'text/plain',
        text: 'Invalid component type: invalidType',
        isError: true,
      });
      expect(mockGetTransformedSpec).not.toHaveBeenCalled();
    });

    it('should return error for non-existent component type in spec', async () => {
      const variables: Variables = { type: 'securitySchemes', name: 'apiKey' };
      const uri = new URL('openapi://components/securitySchemes/apiKey');
      const expectedLogMessage = /Component type "securitySchemes" not found/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      // Expect the specific error message from getValidatedComponentMap
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/securitySchemes/apiKey',
        mimeType: 'text/plain',
        text: 'Component type "securitySchemes" not found in the specification. Available types: schemas, parameters',
        isError: true,
      });
    });

    it('should return error for non-existent component name', async () => {
      const variables: Variables = { type: 'schemas', name: 'NonExistent' };
      const uri = new URL('openapi://components/schemas/NonExistent');
      const expectedLogMessage = /None of the requested names \(NonExistent\) are valid/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      // Expect the specific error message from getValidatedComponentDetails
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/schemas/NonExistent',
        mimeType: 'text/plain',
        // Expect sorted names: Error, User
        text: 'None of the requested names (NonExistent) are valid for component type "schemas". Available names: Error, User',
        isError: true,
      });
    });

    // Remove test for mix of valid/invalid names, as getValidatedComponentDetails throws now
    // it('should handle mix of valid and invalid component names', async () => { ... });

    it('should handle empty name array', async () => {
      const variables: Variables = { type: 'schemas', name: [] };
      const uri = new URL('openapi://components/schemas/');
      const expectedLogMessage = /No valid component name specified/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/schemas/',
        mimeType: 'text/plain',
        text: 'No valid component name specified.',
        isError: true,
      });
    });

    it('should handle spec loading errors', async () => {
      const error = new Error('Spec load failed');
      mockGetTransformedSpec.mockRejectedValue(error);
      const variables: Variables = { type: 'schemas', name: 'User' };
      const uri = new URL('openapi://components/schemas/User');
      const expectedLogMessage = /Spec load failed/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/schemas/User',
        mimeType: 'text/plain',
        text: 'Spec load failed',
        isError: true,
      });
    });

    it('should handle non-OpenAPI v3 spec', async () => {
      const invalidSpec = { swagger: '2.0', info: {} };
      mockGetTransformedSpec.mockResolvedValue(invalidSpec as unknown as OpenAPIV3.Document);
      const variables: Variables = { type: 'schemas', name: 'User' };
      const uri = new URL('openapi://components/schemas/User');
      const expectedLogMessage = /Only OpenAPI v3 specifications are supported/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'openapi://components/schemas/User',
        mimeType: 'text/plain',
        text: 'Only OpenAPI v3 specifications are supported',
        isError: true,
      });
    });
  });
});
