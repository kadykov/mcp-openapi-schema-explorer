import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startMcpServer } from '../../utils/mcp-test-helpers.js';
import { load as yamlLoad } from 'js-yaml';
import { isEndpointErrorResponse } from '../../utils/test-types.js';
import type { EndpointResponse, ResourceResponse } from '../../utils/test-types.js';

function isValidResponse(obj: unknown): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'method' in obj &&
    'path' in obj &&
    typeof (obj as { method: unknown }).method === 'string' &&
    typeof (obj as { path: unknown }).path === 'string'
  );
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function parseYaml(text: string): unknown {
  const result = yamlLoad(text);
  if (result === undefined) {
    throw new Error('Invalid YAML: parsing resulted in undefined');
  }
  return result as unknown;
}

function safeParse(text: string, format: 'json' | 'yaml'): unknown {
  try {
    if (format === 'json') {
      return parseJson(text);
    }
    return parseYaml(text);
  } catch (error) {
    throw new Error(
      `Failed to parse ${format} content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function parseEndpointResponse(text: string, format: 'json' | 'yaml'): EndpointResponse {
  const parsed = safeParse(text, format);
  // Validate the response format
  if (!isEndpointErrorResponse(parsed) && !isValidResponse(parsed)) {
    throw new Error('Invalid endpoint response format');
  }
  return parsed as EndpointResponse;
}

describe('Output Format E2E', () => {
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('JSON format (default)', () => {
    describe('parsing', () => {
      it('should throw error for invalid JSON', () => {
        expect(() => safeParse('invalid json', 'json')).toThrow('Failed to parse json content');
      });

      it('should throw error for invalid YAML', () => {
        expect(() => safeParse(': not valid yaml', 'yaml')).toThrow('Failed to parse yaml content');
      });

      it('should throw error for invalid endpoint response', () => {
        expect(() => parseEndpointResponse('{}', 'json')).toThrow(
          'Invalid endpoint response format'
        );
        expect(() => parseEndpointResponse('method: GET', 'yaml')).toThrow(
          'Invalid endpoint response format'
        );
      });
    });
    let client: Client;

    beforeEach(async () => {
      const context = await startMcpServer('test/fixtures/complex-endpoint.json');
      client = context.client;
      cleanup = context.cleanup;
    });

    it('should return JSON formatted endpoint details', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const response = (await client.readResource({
        uri: `openapi://endpoint/get/${path}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];
      expect(content.mimeType).toBe('application/json');

      // Verify we can parse the JSON
      expect(() => safeParse(content.text, 'json')).not.toThrow();

      const result = parseEndpointResponse(content.text, 'json');
      // Explicitly check if the response matches expected type shape
      expect('method' in result && 'path' in result).toBe(true);
      if ('method' in result && 'path' in result) {
        expect(result.method).toBe('GET');
        expect(result.path).toBe('/api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      }
    });
  });

  describe('YAML format', () => {
    let client: Client;

    beforeEach(async () => {
      const context = await startMcpServer('test/fixtures/complex-endpoint.json', {
        outputFormat: 'yaml',
      });
      client = context.client;
      cleanup = context.cleanup;
    });

    it('should return YAML formatted endpoint details', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const response = (await client.readResource({
        uri: `openapi://endpoint/get/${path}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];
      expect(content.mimeType).toBe('text/yaml');

      // Should be valid YAML
      const result = parseEndpointResponse(content.text, 'yaml');
      // Explicitly check if the response matches expected type shape
      expect('method' in result && 'path' in result).toBe(true);
      if ('method' in result && 'path' in result) {
        expect(result.method).toBe('GET');
        expect(result.path).toBe('/api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      }

      // Should have YAML formatting
      expect(content.text).toContain('method: GET');
      expect(content.text).toContain(
        'path: /api/v1/organizations/{orgId}/projects/{projectId}/tasks'
      );
      expect(content.text).toMatch(/\n$/); // Should end with newline
    });

    it('should use correct mime type in resource template', async () => {
      const response = await client.listResourceTemplates();

      expect(response.resourceTemplates).toContainEqual({
        uriTemplate: 'openapi://endpoint/{method*}/{path*}',
        name: 'endpoint',
        description: 'OpenAPI endpoint details',
        mimeType: 'text/yaml',
      });
    });

    it('should handle endpoint errors in YAML format', async () => {
      const path = encodeURIComponent('does/not/exist');
      const response = (await client.readResource({
        uri: `openapi://endpoint/get/${path}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];
      expect(content.mimeType).toBe('text/yaml');

      // Should contain error in YAML format
      expect(content.text).toContain('method: GET');
      expect(content.text).toContain('path: /does/not/exist');
      expect(content.text).toContain("error: 'Path not found: /does/not/exist'");
    });

    it('should handle multiple operations with consistent YAML format', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const response = (await client.readResource({
        uri: `openapi://endpoint/get,post/${path}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(2);

      for (const content of response.contents) {
        expect(content.mimeType).toBe('text/yaml');
        expect(content.text).toContain('method:');
        expect(content.text).toContain('path:');
        expect(content.text).toMatch(/\n$/);
      }
    });
  });
});
