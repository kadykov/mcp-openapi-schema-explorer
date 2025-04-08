import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startMcpServer } from '../../utils/mcp-test-helpers';

describe('OpenAPI Explorer MCP Server E2E', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const context = await startMcpServer('test/fixtures/complex-endpoint.json');
    client = context.client;
    cleanup = context.cleanup;
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Endpoint Resource', () => {
    it('should return GET endpoint details with parameters', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const response = await client.readResource({
        uri: `openapi://endpoint/get/${path}`
      });

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0].text as string;
      
      // Basic info
      expect(content).toContain('# GET /api/v1/organizations/{orgId}/projects/{projectId}/tasks');

      // Path parameters
      expect(content).toContain('## Path Parameters');
      expect(content).toContain('- `orgId` (string) (required)');
      expect(content).toContain('- `projectId` (string) (required)');

      // Query parameters
      expect(content).toContain('## Query Parameters');
      expect(content).toContain('- `status` (string)');
      expect(content).toContain('- `sort` (string)');
    });

    it('should return POST endpoint details with request body', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const response = await client.readResource({
        uri: `openapi://endpoint/post/${path}`
      });

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0].text as string;
      
      // Basic info
      expect(content).toContain('# POST /api/v1/organizations/{orgId}/projects/{projectId}/tasks');

      // Request Body
      expect(content).toContain('## Request Body');
      expect(content).toContain('Schema: `#/components/schemas/CreateTaskRequest`');

      // Response
      expect(content).toContain('### 201');
      expect(content).toContain('Task created');
      expect(content).toContain('Schema: `#/components/schemas/Task`');
    });

    it('should handle non-existent endpoint', async () => {
      const path = encodeURIComponent('does/not/exist');
      await expect(
        client.readResource({
          uri: `openapi://endpoint/get/${path}`
        })
      ).rejects.toThrow('Endpoint not found: get /does/not/exist');
    });

    it('should handle non-existent method', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      await expect(
        client.readResource({
          uri: `openapi://endpoint/put/${path}`
        })
      ).rejects.toThrow('Endpoint not found: put /api/v1/organizations/{orgId}/projects/{projectId}/tasks');
    });

    describe('Resource Templates', () => {
      it('should list endpoint template', async () => {
        const response = await client.listResourceTemplates();
        
        expect(response.resourceTemplates).toContainEqual({
          name: 'endpoint',
          uriTemplate: 'openapi://endpoint/{method}/{path}',
          mimeType: 'text/markdown'
        });
      });
    });
  });
});
