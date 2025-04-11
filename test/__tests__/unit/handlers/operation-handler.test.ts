import { OpenAPIV3 } from 'openapi-types';
import { OperationHandler } from '../../../../src/handlers/operation-handler';
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
const getOperation: OpenAPIV3.OperationObject = {
  summary: 'Get Item',
  responses: { '200': { description: 'OK' } },
};
const postOperation: OpenAPIV3.OperationObject = {
  summary: 'Create Item',
  responses: { '201': { description: 'Created' } },
};
const sampleSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/items': {
      get: getOperation,
      post: postOperation,
    },
    '/items/{id}': {
      get: { summary: 'Get Single Item', responses: { '200': { description: 'OK' } } },
    },
  },
  components: {},
};

const encodedPathItems = encodeURIComponent('items');
const encodedPathNonExistent = encodeURIComponent('nonexistent');

describe('OperationHandler', () => {
  let handler: OperationHandler;

  beforeEach(() => {
    handler = new OperationHandler(mockSpecLoader, mockFormatter);
    mockGetTransformedSpec.mockReset();
    mockGetTransformedSpec.mockResolvedValue(sampleSpec); // Default mock
  });

  it('should return the correct template', () => {
    const template = handler.getTemplate();
    expect(template).toBeInstanceOf(ResourceTemplate);
    expect(template.uriTemplate.toString()).toBe('openapi://paths/{path}/{method*}');
  });

  describe('handleRequest', () => {
    const mockExtra = { signal: new AbortController().signal };

    it('should return detail for a single valid method', async () => {
      const variables: Variables = { path: encodedPathItems, method: 'get' }; // Use 'method' key
      const uri = new URL(`openapi://paths/${encodedPathItems}/get`);

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(mockGetTransformedSpec).toHaveBeenCalledWith({
        resourceType: 'schema',
        format: 'openapi',
      });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathItems}/get`,
        mimeType: 'application/json',
        text: JSON.stringify(getOperation, null, 2),
        isError: false,
      });
    });

    it('should return details for multiple valid methods (array input)', async () => {
      const variables: Variables = { path: encodedPathItems, method: ['get', 'post'] }; // Use 'method' key with array
      const uri = new URL(`openapi://paths/${encodedPathItems}/get,post`); // URI might not reflect array input

      const result = await handler.handleRequest(uri, variables, mockExtra);

      expect(result.contents).toHaveLength(2);
      expect(result.contents).toContainEqual({
        uri: `openapi://paths/${encodedPathItems}/get`,
        mimeType: 'application/json',
        text: JSON.stringify(getOperation, null, 2),
        isError: false,
      });
      expect(result.contents).toContainEqual({
        uri: `openapi://paths/${encodedPathItems}/post`,
        mimeType: 'application/json',
        text: JSON.stringify(postOperation, null, 2),
        isError: false,
      });
    });

    it('should return error for non-existent path', async () => {
      const variables: Variables = { path: encodedPathNonExistent, method: 'get' };
      const uri = new URL(`openapi://paths/${encodedPathNonExistent}/get`);
      const expectedLogMessage = /Path "\/nonexistent" not found/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      // Expect the specific error message from getValidatedPathItem
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathNonExistent}/get`,
        mimeType: 'text/plain',
        text: 'Path "/nonexistent" not found in the specification.',
        isError: true,
      });
    });

    it('should return error for non-existent method', async () => {
      const variables: Variables = { path: encodedPathItems, method: 'put' };
      const uri = new URL(`openapi://paths/${encodedPathItems}/put`);
      const expectedLogMessage = /None of the requested methods \(put\) are valid/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      // Expect the specific error message from getValidatedOperations
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathItems}/put`,
        mimeType: 'text/plain',
        text: 'None of the requested methods (put) are valid for path "/items". Available methods: get, post',
        isError: true,
      });
    });

    // Remove test for mix of valid/invalid methods, as getValidatedOperations throws now
    // it('should handle mix of valid and invalid methods', async () => { ... });

    it('should handle empty method array', async () => {
      const variables: Variables = { path: encodedPathItems, method: [] };
      const uri = new URL(`openapi://paths/${encodedPathItems}/`);
      const expectedLogMessage = /No valid HTTP method specified/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathItems}/`,
        mimeType: 'text/plain',
        text: 'No valid HTTP method specified.',
        isError: true,
      });
    });

    it('should handle spec loading errors', async () => {
      const error = new Error('Spec load failed');
      mockGetTransformedSpec.mockRejectedValue(error);
      const variables: Variables = { path: encodedPathItems, method: 'get' };
      const uri = new URL(`openapi://paths/${encodedPathItems}/get`);
      const expectedLogMessage = /Spec load failed/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathItems}/get`,
        mimeType: 'text/plain',
        text: 'Spec load failed',
        isError: true,
      });
    });

    it('should handle non-OpenAPI v3 spec', async () => {
      const invalidSpec = { swagger: '2.0', info: {} };
      mockGetTransformedSpec.mockResolvedValue(invalidSpec as unknown as OpenAPIV3.Document);
      const variables: Variables = { path: encodedPathItems, method: 'get' };
      const uri = new URL(`openapi://paths/${encodedPathItems}/get`);
      const expectedLogMessage = /Only OpenAPI v3 specifications are supported/;

      const result = await suppressExpectedConsoleError(expectedLogMessage, () =>
        handler.handleRequest(uri, variables, mockExtra)
      );

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: `openapi://paths/${encodedPathItems}/get`,
        mimeType: 'text/plain',
        text: 'Only OpenAPI v3 specifications are supported',
        isError: true,
      });
    });
  });
});
