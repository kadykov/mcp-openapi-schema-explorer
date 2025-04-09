import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startMcpServer } from '../../utils/mcp-test-helpers.js';
import { OpenAPIV3 } from 'openapi-types';

interface EndpointResponse {
  method: string;
  path: string;
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses: { [key: string]: OpenAPIV3.ResponseObject };
}

interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

interface ResourceResponse {
  contents: ResourceContent[];
}

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
      const response = (await client.readResource({
        uri: `openapi://endpoint/get/${path}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = JSON.parse(response.contents[0].text) as EndpointResponse;

      // Basic info
      expect(content.method).toBe('GET');
      expect(content.path).toBe('/api/v1/organizations/{orgId}/projects/{projectId}/tasks');

      // Parameters
      expect(content.parameters).toEqual(
        expect.arrayContaining([
          {
            name: 'orgId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['active', 'completed'],
            },
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['created', 'updated', 'priority'],
            },
          },
        ])
      );
    });

    it('should return POST endpoint details with request body', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      const response = (await client.readResource({
        uri: `openapi://endpoint/post/${path}`,
      })) as ResourceResponse;

      expect(response.contents).toHaveLength(1);
      const content = JSON.parse(response.contents[0].text) as EndpointResponse;

      // Basic info
      expect(content.method).toBe('POST');
      expect(content.path).toBe('/api/v1/organizations/{orgId}/projects/{projectId}/tasks');

      // Request Body
      expect(content.requestBody).toMatchObject({
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title'],
              properties: {
                title: {
                  type: 'string',
                },
                status: {
                  type: 'string',
                  enum: ['active', 'completed'],
                  default: 'active',
                },
                priority: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 5,
                  default: 3,
                },
              },
            },
          },
        },
      });

      // Response
      expect(content.responses['201']).toMatchObject({
        description: 'Task created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['id', 'title', 'status'],
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                title: {
                  type: 'string',
                },
                status: {
                  type: 'string',
                  enum: ['active', 'completed'],
                },
                priority: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 5,
                },
              },
            },
          },
        },
      });
    });

    it('should handle non-existent endpoint', async () => {
      const path = encodeURIComponent('does/not/exist');
      await expect(
        client.readResource({
          uri: `openapi://endpoint/get/${path}`,
        })
      ).rejects.toThrow('Path not found: /does/not/exist');
    });

    it('should handle non-existent method', async () => {
      const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
      await expect(
        client.readResource({
          uri: `openapi://endpoint/put/${path}`,
        })
      ).rejects.toThrow(
        'Method put not found for path: /api/v1/organizations/{orgId}/projects/{projectId}/tasks'
      );
    });

    describe('Resource Templates', () => {
      it('should list endpoint template', async () => {
        const response = await client.listResourceTemplates();

        expect(response.resourceTemplates).toContainEqual({
          uriTemplate: 'openapi://endpoint/{method}/{path}',
          name: 'endpoint',
          description: 'OpenAPI endpoint details',
          mimeType: 'application/json',
        });
      });
    });
  });
});
