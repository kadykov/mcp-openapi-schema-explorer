import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startMcpServer } from '../../utils/mcp-test-helpers.js';
import { OpenAPIV3 } from 'openapi-types';

interface EndpointSuccessResponse {
  method: string;
  path: string;
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses: { [key: string]: OpenAPIV3.ResponseObject };
}

interface EndpointErrorResponse {
  method: string;
  path: string;
  error: string;
}

type EndpointResponse = EndpointSuccessResponse | EndpointErrorResponse;

function isEndpointErrorResponse(obj: unknown): obj is EndpointErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as EndpointErrorResponse).error === 'string'
  );
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
    describe('Single Operation', () => {
      it('should return GET endpoint details with parameters', async () => {
        const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
        const response = (await client.readResource({
          uri: `openapi://endpoint/get/${path}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = JSON.parse(response.contents[0].text) as EndpointResponse;
        expect(isEndpointErrorResponse(content)).toBe(false);
        if (!isEndpointErrorResponse(content)) {
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
        }
      });

      it('should return POST endpoint details with request body', async () => {
        const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
        const response = (await client.readResource({
          uri: `openapi://endpoint/post/${path}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = JSON.parse(response.contents[0].text) as EndpointResponse;
        expect(isEndpointErrorResponse(content)).toBe(false);
        if (!isEndpointErrorResponse(content)) {
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
        }
      });

      it('should handle non-existent endpoint with error response', async () => {
        const path = encodeURIComponent('does/not/exist');
        const response = (await client.readResource({
          uri: `openapi://endpoint/get/${path}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = JSON.parse(response.contents[0].text) as EndpointResponse;
        expect(isEndpointErrorResponse(content)).toBe(true);
        if (isEndpointErrorResponse(content)) {
          expect(content.error).toBe('Path not found: /does/not/exist');
        }
      });

      it('should handle non-existent method with error response', async () => {
        const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
        const response = (await client.readResource({
          uri: `openapi://endpoint/put/${path}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = JSON.parse(response.contents[0].text) as EndpointResponse;
        expect(isEndpointErrorResponse(content)).toBe(true);
        if (isEndpointErrorResponse(content)) {
          expect(content.error).toBe(
            'Method put not found for path: /api/v1/organizations/{orgId}/projects/{projectId}/tasks'
          );
        }
      });
    });

    describe('Multiple Operations', () => {
      it('should handle multiple methods for single path', async () => {
        const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
        const response = (await client.readResource({
          uri: `openapi://endpoint/get,post/${path}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = JSON.parse(response.contents[0].text) as EndpointResponse[];
        expect(Array.isArray(content)).toBe(true);
        expect(content).toHaveLength(2);

        // GET operation
        const getOperation = content.find(op => op.method === 'GET');
        expect(getOperation).toBeDefined();
        expect(isEndpointErrorResponse(getOperation)).toBe(false);
        if (getOperation && !isEndpointErrorResponse(getOperation)) {
          expect(getOperation.parameters).toBeDefined();
          expect(getOperation.parameters).toHaveLength(4); // orgId, projectId, status, sort
        }

        // POST operation
        const postOperation = content.find(op => op.method === 'POST');
        expect(postOperation).toBeDefined();
        expect(isEndpointErrorResponse(postOperation)).toBe(false);
        if (postOperation && !isEndpointErrorResponse(postOperation)) {
          expect(postOperation.requestBody).toBeDefined();
          expect(postOperation.requestBody?.required).toBe(true);
        }
      });

      it('should handle multiple paths for single method', async () => {
        const paths = [
          'api/v1/organizations/{orgId}/projects/{projectId}/tasks',
          'api/v1/organizations/{orgId}/projects/{projectId}/tasks',
        ].map(encodeURIComponent);

        const response = (await client.readResource({
          uri: `openapi://endpoint/get/${paths.join(',')}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = JSON.parse(response.contents[0].text) as EndpointResponse[];
        expect(Array.isArray(content)).toBe(true);
        expect(content).toHaveLength(2);

        // All operations should be valid GETs
        expect(content.every(op => op.method === 'GET')).toBe(true);
        expect(content.every(op => !isEndpointErrorResponse(op))).toBe(true);

        // All paths should be the same since we used the same path twice
        expect(
          content.every(
            op => op.path === '/api/v1/organizations/{orgId}/projects/{projectId}/tasks'
          )
        ).toBe(true);
      });

      it('should handle mixed valid and invalid operations', async () => {
        const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
        const response = (await client.readResource({
          uri: `openapi://endpoint/get,put,post/${path}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = JSON.parse(response.contents[0].text) as EndpointResponse[];
        expect(Array.isArray(content)).toBe(true);
        expect(content).toHaveLength(3);

        // GET and POST should be valid, PUT should have error
        const getOperation = content.find(op => op.method === 'GET');
        const postOperation = content.find(op => op.method === 'POST');
        const putOperation = content.find(op => op.method === 'PUT');

        expect(isEndpointErrorResponse(getOperation)).toBe(false);
        expect(isEndpointErrorResponse(postOperation)).toBe(false);
        expect(isEndpointErrorResponse(putOperation)).toBe(true);
      });
    });

    describe('Resource Templates', () => {
      it('should list endpoint template', async () => {
        const response = await client.listResourceTemplates();

        expect(response.resourceTemplates).toContainEqual({
          uriTemplate: 'openapi://endpoint/{method*}/{path*}',
          name: 'endpoint',
          description: 'OpenAPI endpoint details',
          mimeType: 'application/json',
        });
      });
    });
  });
});
