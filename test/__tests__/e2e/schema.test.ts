import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startMcpServer } from '../../utils/mcp-test-helpers.js';
import { isSchemaErrorResponse } from '../../utils/test-types.js'; // Assuming this will be added
import type { SchemaResponse, ResourceResponse } from '../../utils/test-types.js'; // Assuming SchemaResponse will be added

describe('OpenAPI Explorer MCP Server E2E - Schema Resource', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  // Use the same complex fixture as endpoint tests, as it contains schemas
  const fixturePath = 'test/fixtures/complex-endpoint.json';

  beforeAll(async () => {
    // Start server once for all tests in this suite
    const context = await startMcpServer(fixturePath);
    client = context.client;
    cleanup = context.cleanup;
  });

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Single Schema', () => {
    it('should return details for a valid schema name (Task)', async () => {
      const schemaName = 'Task';
      const encodedName = encodeURIComponent(schemaName);
      const response = (await client.readResource({
        uri: `openapi://schema/${encodedName}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];
      expect(content.uri).toBe(`openapi://schema/${encodedName}`);
      expect(content.mimeType).toBe('application/json'); // Assuming default JSON output
      // Remove isError check, rely on type guard below

      const schema = JSON.parse(content.text) as SchemaResponse;
      expect(isSchemaErrorResponse(schema)).toBe(false); // Assert it's NOT an error
      if (!isSchemaErrorResponse(schema)) {
        // Type guard narrows type
        expect(schema.type).toBe('object');
        expect(schema.properties).toHaveProperty('id'); // Safe access now
        expect(schema.properties).toHaveProperty('title');
        expect(schema.properties).toHaveProperty('status');
        expect(schema.required).toEqual(['id', 'title', 'status']);
      }
    });

    it('should return details for another valid schema name (CreateTaskRequest)', async () => {
      const schemaName = 'CreateTaskRequest';
      const encodedName = encodeURIComponent(schemaName);
      const response = (await client.readResource({
        uri: `openapi://schema/${encodedName}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];
      expect(content.uri).toBe(`openapi://schema/${encodedName}`);
      expect(content.mimeType).toBe('application/json');
      // Remove isError check

      const schema = JSON.parse(content.text) as SchemaResponse;
      expect(isSchemaErrorResponse(schema)).toBe(false); // Assert it's NOT an error
      if (!isSchemaErrorResponse(schema)) {
        // Type guard narrows type
        expect(schema.type).toBe('object');
        expect(schema.properties).toHaveProperty('title'); // Safe access now
        expect(schema.properties).toHaveProperty('status'); // Correct property
        expect(schema.properties).toHaveProperty('priority'); // Correct property
        expect(schema.required).toEqual(['title']);
      }
    });

    it('should return error for non-existent schema name', async () => {
      const schemaName = 'DoesNotExist';
      const encodedName = encodeURIComponent(schemaName);
      const response = (await client.readResource({
        uri: `openapi://schema/${encodedName}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];
      expect(content.uri).toBe(`openapi://schema/${encodedName}`);
      expect(content.mimeType).toBe('application/json');
      // Remove isError check

      const errorResponse: unknown = JSON.parse(content.text); // Assign to unknown first
      expect(isSchemaErrorResponse(errorResponse)).toBe(true); // Assert it IS an error
      if (isSchemaErrorResponse(errorResponse)) {
        // Type guard narrows type
        expect(errorResponse.name).toBe(schemaName); // Safe access now
        expect(errorResponse.error).toBe(`Schema not found: ${schemaName}`);
      }
    });
  });

  describe('Multiple Schemas', () => {
    it('should return details for multiple valid schema names', async () => {
      const schemaNames = ['Task', 'CreateTaskRequest'];
      const encodedNames = schemaNames.map(encodeURIComponent);
      const response = (await client.readResource({
        uri: `openapi://schema/${encodedNames.join(',')}`, // Use comma separation for multiple values
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(2);

      // Check Task schema
      const taskContent = response.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[0]}`
      );
      expect(taskContent).toBeDefined();
      expect(taskContent?.mimeType).toBe('application/json');
      // Remove isError check
      const taskSchema = JSON.parse(taskContent!.text) as SchemaResponse;
      expect(isSchemaErrorResponse(taskSchema)).toBe(false); // Assert it's NOT an error
      if (!isSchemaErrorResponse(taskSchema)) {
        // Type guard
        expect(taskSchema.properties).toHaveProperty('id'); // Safe access
      }

      // Check CreateTaskRequest schema
      const createContent = response.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[1]}`
      );
      expect(createContent).toBeDefined();
      expect(createContent?.mimeType).toBe('application/json');
      // Remove isError check
      const createSchema = JSON.parse(createContent!.text) as SchemaResponse;
      expect(isSchemaErrorResponse(createSchema)).toBe(false); // Assert it's NOT an error
      if (!isSchemaErrorResponse(createSchema)) {
        // Type guard
        expect(createSchema.properties).toHaveProperty('title'); // Safe access
      }
    });

    it('should handle mixed valid and invalid schema names', async () => {
      const schemaNames = ['Task', 'InvalidSchema', 'CreateTaskRequest'];
      const encodedNames = schemaNames.map(encodeURIComponent);
      const response = (await client.readResource({
        uri: `openapi://schema/${encodedNames.join(',')}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(3);

      // Check Task (valid)
      const taskContent = response.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[0]}`
      );
      expect(taskContent).toBeDefined();
      // Remove isError check
      const taskSchema = JSON.parse(taskContent!.text) as SchemaResponse;
      expect(isSchemaErrorResponse(taskSchema)).toBe(false); // Assert it's NOT an error

      // Check InvalidSchema (invalid)
      const invalidContent = response.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[1]}`
      );
      expect(invalidContent).toBeDefined();
      // Remove isError check
      const invalidError: unknown = JSON.parse(invalidContent!.text); // Assign to unknown first
      expect(isSchemaErrorResponse(invalidError)).toBe(true); // Assert it IS an error
      if (isSchemaErrorResponse(invalidError)) {
        // Type guard
        expect(invalidError.name).toBe(schemaNames[1]); // Safe access
      }

      // Check CreateTaskRequest (valid)
      const createContent = response.contents.find(
        c => c.uri === `openapi://schema/${encodedNames[2]}`
      );
      expect(createContent).toBeDefined();
      // Remove isError check
      const createSchema = JSON.parse(createContent!.text) as SchemaResponse;
      expect(isSchemaErrorResponse(createSchema)).toBe(false); // Assert it's NOT an error
    });
  });

  describe('Resource Templates', () => {
    it('should list schema template', async () => {
      const response = await client.listResourceTemplates();

      // Check if the schema template is present alongside others
      expect(response.resourceTemplates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uriTemplate: 'openapi://schema/{name*}',
            name: 'schema',
            description: 'OpenAPI schema details',
            mimeType: 'application/json', // Assuming default JSON
          }),
        ])
      );
    });
  });
});
