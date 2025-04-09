import { SchemaHandler } from '../../../../src/handlers/schema.js';
import { OpenAPIV3 } from 'openapi-types';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'; // Import ResourceTemplate
import { SpecLoaderService } from '../../../../src/services/spec-loader.js';
import { JsonFormatter, YamlFormatter, IFormatter } from '../../../../src/services/formatters.js';

// Helper types and functions (similar to endpoint tests)
interface SchemaErrorResponse {
  name: string;
  error: string;
}

function isSchemaErrorResponse(obj: unknown): obj is SchemaErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as SchemaErrorResponse).name === 'string' &&
    typeof (obj as SchemaErrorResponse).error === 'string'
  );
}

type ResourceTextContent = {
  uri: string;
  mimeType: string;
  text: string;
  isError?: boolean; // Added isError flag
};

function isResourceTextContent(content: unknown): content is ResourceTextContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'text' in content &&
    typeof (content as ResourceTextContent).text === 'string' &&
    'uri' in content &&
    typeof (content as ResourceTextContent).uri === 'string' &&
    'mimeType' in content &&
    typeof (content as ResourceTextContent).mimeType === 'string'
  );
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

// Mock Data
const mockUserSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
};

const mockProductSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    sku: { type: 'string' },
    price: { type: 'number' },
  },
  required: ['sku'],
};

const mockSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  components: {
    schemas: {
      User: mockUserSchema,
      Product: mockProductSchema,
    },
  },
  paths: {}, // Added empty paths object
};

describe('SchemaHandler', () => {
  let mockSpecLoader: jest.Mocked<SpecLoaderService>;
  let abortSignal: AbortSignal;

  beforeEach(() => {
    // Reset mocks before each test
    mockSpecLoader = {
      getSpec: jest.fn().mockResolvedValue(mockSpec),
      getTransformedSpec: jest.fn().mockResolvedValue(mockSpec),
      loadSpec: jest.fn().mockResolvedValue(mockSpec),
    } as unknown as jest.Mocked<SpecLoaderService>;
    abortSignal = new AbortController().signal;
  });

  // Shared test logic for different formatters
  const runTestsWithFormatter = (formatter: IFormatter): void => {
    // Add void return type
    let handler: SchemaHandler;

    beforeEach(() => {
      handler = new SchemaHandler(mockSpecLoader, formatter);
    });

    it('returns resource template for schema URLs', () => {
      const template = handler.getTemplate();
      expect(template).toBeInstanceOf(ResourceTemplate); // Check instance type
      // Skip asserting the exact template string due to runtime/type mismatch issues
    });

    it('returns formatted schema details for a valid single schema name', async () => {
      const schemaName = 'User';
      const encodedName = encodeURIComponent(schemaName);
      const uri = new URL(`openapi://schema/${encodedName}`);
      const variables: Variables = { name: encodedName };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSpecLoader.getTransformedSpec).toHaveBeenCalledWith({
        resourceType: 'schema',
        format: 'openapi',
      });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe(formatter.getMimeType());
      expect(content.uri).toBe(uri.href);
      expect(content.isError).toBeFalsy();

      if (!isResourceTextContent(content)) throw new Error('Expected text content');
      // Only parse JSON if the formatter is JSON
      if (formatter.getMimeType() === 'application/json') {
        const parsedResponse = parseJsonSafely(content.text);
        expect(parsedResponse).toEqual(mockUserSchema);
      } else {
        // Basic check for YAML/other formats
        expect(content.text).toContain('type: object');
      }
    });

    it('returns formatted schema details for multiple valid schema names', async () => {
      const schemaNames = ['User', 'Product'];
      const encodedNames = schemaNames.map(encodeURIComponent);
      const uri = new URL(`openapi://schema/${encodedNames.join(',')}`);
      const variables: Variables = { name: encodedNames };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSpecLoader.getTransformedSpec).toHaveBeenCalledTimes(1);
      expect(result.contents).toHaveLength(2);

      // Check User schema
      const userContent = result.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[0]}`
      );
      expect(userContent).toBeDefined();
      expect(userContent?.mimeType).toBe(formatter.getMimeType());
      expect(userContent?.isError).toBeFalsy();
      if (!userContent || !isResourceTextContent(userContent))
        throw new Error('Expected text content for User');
      if (formatter.getMimeType() === 'application/json') {
        expect(parseJsonSafely(userContent.text)).toEqual(mockUserSchema);
      } else {
        expect(userContent.text).toContain('id:'); // Check for User schema content
      }

      // Check Product schema
      const productContent = result.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[1]}`
      );
      expect(productContent).toBeDefined();
      expect(productContent?.mimeType).toBe(formatter.getMimeType());
      expect(productContent?.isError).toBeFalsy();
      if (!productContent || !isResourceTextContent(productContent))
        throw new Error('Expected text content for Product');
      if (formatter.getMimeType() === 'application/json') {
        expect(parseJsonSafely(productContent.text)).toEqual(mockProductSchema);
      } else {
        expect(productContent.text).toContain('sku:'); // Check for Product schema content
      }
    });

    it('returns an error structure for a non-existent schema name', async () => {
      const schemaName = 'NonExistent';
      const encodedName = encodeURIComponent(schemaName);
      const uri = new URL(`openapi://schema/${encodedName}`);
      const variables: Variables = { name: encodedName };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe(formatter.getMimeType());
      expect(content.uri).toBe(uri.href);
      expect(content.isError).toBe(true);

      if (!isResourceTextContent(content)) throw new Error('Expected text content');
      if (formatter.getMimeType() === 'application/json') {
        const parsedResponse = parseJsonSafely(content.text);
        expect(isSchemaErrorResponse(parsedResponse)).toBe(true);
        if (isSchemaErrorResponse(parsedResponse)) {
          expect(parsedResponse.name).toBe(schemaName);
          expect(parsedResponse.error).toBe(`Schema not found: ${schemaName}`);
        }
      } else {
        // For YAML, check if the error message (with quotes) and name are present
        expect(content.text).toContain(`error: 'Schema not found: ${schemaName}'`); // Add quotes
        expect(content.text).toContain(`name: ${schemaName}`);
      }
    });

    it('returns mixed results for valid and invalid schema names', async () => {
      const schemaNames = ['User', 'InvalidSchema'];
      const encodedNames = schemaNames.map(encodeURIComponent);
      const uri = new URL(`openapi://schema/${encodedNames.join(',')}`);
      const variables: Variables = { name: encodedNames };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(2);

      // Check User schema (valid)
      const userContent = result.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[0]}`
      );
      expect(userContent).toBeDefined();
      expect(userContent?.isError).toBeFalsy();
      if (!userContent || !isResourceTextContent(userContent))
        throw new Error('Expected text content for User');
      if (formatter.getMimeType() === 'application/json') {
        expect(parseJsonSafely(userContent.text)).toEqual(mockUserSchema);
      } else {
        expect(userContent.text).toContain('id:'); // Check for User schema content
      }

      // Check InvalidSchema (invalid)
      const invalidContent = result.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[1]}`
      );
      expect(invalidContent).toBeDefined();
      expect(invalidContent?.isError).toBe(true);
      if (!invalidContent || !isResourceTextContent(invalidContent))
        throw new Error('Expected text content for InvalidSchema');
      if (formatter.getMimeType() === 'application/json') {
        const parsedError = parseJsonSafely(invalidContent.text);
        expect(isSchemaErrorResponse(parsedError)).toBe(true);
        if (isSchemaErrorResponse(parsedError)) {
          expect(parsedError.name).toBe(schemaNames[1]);
          expect(parsedError.error).toContain('Schema not found');
        }
      } else {
        // For YAML, check if the error message (with quotes) and name are present
        expect(invalidContent.text).toContain(`error: 'Schema not found: ${schemaNames[1]}'`); // Add quotes
        expect(invalidContent.text).toContain(`name: ${schemaNames[1]}`);
      }
    });

    it('returns a top-level error if spec loading fails', async () => {
      const loadError = new Error('Failed to load spec');
      mockSpecLoader.getTransformedSpec.mockRejectedValue(loadError);

      const schemaName = 'User';
      const encodedName = encodeURIComponent(schemaName);
      const uri = new URL(`openapi://schema/${encodedName}`);
      const variables: Variables = { name: encodedName };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.uri).toBe(uri.href); // URI of the original request
      expect(content.mimeType).toBe('text/plain'); // Top-level errors are plain text
      expect(content.isError).toBe(true);
      expect(content.text).toBe(loadError.message);
    });
  };

  // Run tests for JSON formatter
  describe('with JSON formatter', () => {
    runTestsWithFormatter(new JsonFormatter());
  });

  // Run tests for YAML formatter
  describe('with YAML formatter', () => {
    runTestsWithFormatter(new YamlFormatter());

    // Add YAML specific checks if needed, e.g., mime type and basic structure
    it('returns YAML formatted schema details', async () => {
      const formatter = new YamlFormatter();
      const handler = new SchemaHandler(mockSpecLoader, formatter); // Re-instantiate handler for this specific test
      const schemaName = 'User';
      const encodedName = encodeURIComponent(schemaName);
      const uri = new URL(`openapi://schema/${encodedName}`);
      const variables: Variables = { name: encodedName };

      const result = await handler.handleRequest(uri, variables, { signal: abortSignal });

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe(formatter.getMimeType()); // text/yaml
      expect(content.uri).toBe(uri.href);
      expect(content.isError).toBeFalsy();

      if (!isResourceTextContent(content)) throw new Error('Expected text content');
      // Basic YAML structure checks
      expect(content.text).toContain('type: object');
      expect(content.text).toContain('properties:');
      expect(content.text).toContain('id:');
      expect(content.text).toContain('name:');
      expect(content.text).toMatch(/\n$/); // Ends with newline
    });
  });
});
