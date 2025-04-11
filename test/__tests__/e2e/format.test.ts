import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startMcpServer, McpTestContext } from '../../utils/mcp-test-helpers.js'; // Import McpTestContext
import { load as yamlLoad } from 'js-yaml';
// Remove old test types/guards if not needed, or adapt them
// import { isEndpointErrorResponse } from '../../utils/test-types.js';
// import type { EndpointResponse, ResourceResponse } from '../../utils/test-types.js';
// Import specific SDK types needed
import { ReadResourceResult, TextResourceContents } from '@modelcontextprotocol/sdk/types.js';
// Generic type guard for simple object check
function isObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

// Type guard to check if content is TextResourceContents
function hasTextContent(
  content: ReadResourceResult['contents'][0]
): content is TextResourceContents {
  // Check for the 'text' property specifically and ensure it's not undefined
  return content && typeof (content as TextResourceContents).text === 'string';
}

function parseJson(text: string | undefined): unknown {
  if (text === undefined) throw new Error('Cannot parse undefined text');
  return JSON.parse(text);
}

function parseYaml(text: string | undefined): unknown {
  if (text === undefined) throw new Error('Cannot parse undefined text');
  const result = yamlLoad(text);
  if (result === undefined) {
    throw new Error('Invalid YAML: parsing resulted in undefined');
  }
  return result;
}

function safeParse(text: string | undefined, format: 'json' | 'yaml'): unknown {
  try {
    return format === 'json' ? parseJson(text) : parseYaml(text);
  } catch (error) {
    throw new Error(
      `Failed to parse ${format} content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Removed old parseEndpointResponse

describe('Output Format E2E', () => {
  let testContext: McpTestContext;
  let client: Client;

  afterEach(async () => {
    await testContext?.cleanup();
  });

  describe('JSON format (default)', () => {
    beforeEach(async () => {
      testContext = await startMcpServer('test/fixtures/complex-endpoint.json', {
        outputFormat: 'json',
      });
      client = testContext.client;
    });

    it('should return JSON for openapi://info', async () => {
      const result = await client.readResource({ uri: 'openapi://info' });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('application/json');
      if (!hasTextContent(content)) throw new Error('Expected text content'); // Add guard
      expect(() => safeParse(content.text, 'json')).not.toThrow();
      const data = safeParse(content.text, 'json');
      expect(isObject(data) && data['title']).toBe('Complex Endpoint Test API'); // Use bracket notation after guard
    });

    it('should return JSON for operation detail', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const result = await client.readResource({ uri: `openapi://paths/${path}/get` });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('application/json');
      if (!hasTextContent(content)) throw new Error('Expected text content'); // Add guard
      expect(() => safeParse(content.text, 'json')).not.toThrow();
      const data = safeParse(content.text, 'json');
      expect(isObject(data) && data['operationId']).toBe('getProjectTasks'); // Use bracket notation after guard
    });

    it('should return JSON for component detail', async () => {
      const result = await client.readResource({ uri: 'openapi://components/schemas/Task' });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('application/json');
      if (!hasTextContent(content)) throw new Error('Expected text content'); // Add guard
      expect(() => safeParse(content.text, 'json')).not.toThrow();
      const data = safeParse(content.text, 'json');
      expect(isObject(data) && data['type']).toBe('object'); // Use bracket notation after guard
      expect(
        isObject(data) &&
          isObject(data['properties']) &&
          isObject(data['properties']['id']) &&
          data['properties']['id']['type']
      ).toBe('string'); // Use bracket notation with type checking
    });
  });

  describe('YAML format', () => {
    beforeEach(async () => {
      testContext = await startMcpServer('test/fixtures/complex-endpoint.json', {
        outputFormat: 'yaml',
      });
      client = testContext.client;
    });

    it('should return YAML for openapi://info', async () => {
      const result = await client.readResource({ uri: 'openapi://info' });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/yaml');
      if (!hasTextContent(content)) throw new Error('Expected text content'); // Add guard
      expect(() => safeParse(content.text, 'yaml')).not.toThrow();
      expect(content.text).toContain('title: Complex Endpoint Test API');
      expect(content.text).toMatch(/\n$/);
    });

    it('should return YAML for operation detail', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const result = await client.readResource({ uri: `openapi://paths/${path}/get` });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/yaml');
      if (!hasTextContent(content)) throw new Error('Expected text content'); // Add guard
      expect(() => safeParse(content.text, 'yaml')).not.toThrow();
      expect(content.text).toContain('operationId: getProjectTasks');
      expect(content.text).toMatch(/\n$/);
    });

    it('should return YAML for component detail', async () => {
      const result = await client.readResource({ uri: 'openapi://components/schemas/Task' });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/yaml');
      if (!hasTextContent(content)) throw new Error('Expected text content'); // Add guard
      expect(() => safeParse(content.text, 'yaml')).not.toThrow();
      expect(content.text).toContain('type: object');
      expect(content.text).toContain('properties:');
      expect(content.text).toContain('id:');
      expect(content.text).toMatch(/\n$/);
    });

    // Note: The test for listResourceTemplates is removed as it tested old template structure.
    // We could add a new test here if needed, but the mimeType for templates isn't explicitly set anymore.

    it('should handle errors in YAML format (e.g., invalid component name)', async () => {
      const result = await client.readResource({ uri: 'openapi://components/schemas/InvalidName' });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      // Errors are always text/plain, regardless of configured output format
      expect(content.mimeType).toBe('text/plain');
      expect(content.isError).toBe(true);
      if (!hasTextContent(content)) throw new Error('Expected text');
      // Updated error message from getValidatedComponentDetails with sorted names
      expect(content.text).toContain(
        'None of the requested names (InvalidName) are valid for component type "schemas". Available names: CreateTaskRequest, Task, TaskList'
      );
    });
  });
});
