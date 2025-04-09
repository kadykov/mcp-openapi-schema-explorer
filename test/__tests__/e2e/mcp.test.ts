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

          // Request Body - now using reference
          expect(content.requestBody).toMatchObject({
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: 'openapi://schema/CreateTaskRequest',
                },
              },
            },
          });

          // Response - now using reference
          expect(content.responses['201']).toMatchObject({
            description: 'Task created',
            content: {
              'application/json': {
                schema: {
                  $ref: 'openapi://schema/Task',
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

        expect(response.contents).toHaveLength(2);

        // GET operation
        const getContent = response.contents.find(c => c.uri === `openapi://endpoint/get/${path}`);
        expect(getContent).toBeDefined();
        expect(getContent?.mimeType).toBe('application/json');

        const getOperation = JSON.parse(getContent!.text) as EndpointResponse;
        expect(isEndpointErrorResponse(getOperation)).toBe(false);
        if (!isEndpointErrorResponse(getOperation)) {
          expect(getOperation.method).toBe('GET');
          expect(getOperation.parameters).toBeDefined();
          expect(getOperation.parameters).toHaveLength(4); // orgId, projectId, status, sort
        }

        // POST operation
        const postContent = response.contents.find(
          c => c.uri === `openapi://endpoint/post/${path}`
        );
        expect(postContent).toBeDefined();
        expect(postContent?.mimeType).toBe('application/json');

        const postOperation = JSON.parse(postContent!.text) as EndpointResponse;
        expect(isEndpointErrorResponse(postOperation)).toBe(false);
        if (!isEndpointErrorResponse(postOperation)) {
          expect(postOperation.method).toBe('POST');
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

        expect(response.contents).toHaveLength(2);

        // Each content item should be a valid GET operation for the same path
        for (const content of response.contents) {
          expect(content.uri).toMatch(/^openapi:\/\/endpoint\/get\//);
          expect(content.mimeType).toBe('application/json');

          const operation = JSON.parse(content.text) as EndpointResponse;
          expect(isEndpointErrorResponse(operation)).toBe(false);
          if (!isEndpointErrorResponse(operation)) {
            expect(operation.method).toBe('GET');
            expect(operation.path).toBe('/api/v1/organizations/{orgId}/projects/{projectId}/tasks');
          }
        }
      });

      it('should handle mixed valid and invalid operations', async () => {
        const path = encodeURIComponent('api/v1/organizations/{orgId}/projects/{projectId}/tasks');
        const response = (await client.readResource({
          uri: `openapi://endpoint/get,put,post/${path}`,
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(3);

        // GET operation should be valid
        const getContent = response.contents.find(c => c.uri === `openapi://endpoint/get/${path}`);
        expect(getContent).toBeDefined();
        const getOperation = JSON.parse(getContent!.text) as EndpointResponse;
        expect(isEndpointErrorResponse(getOperation)).toBe(false);

        // POST operation should be valid
        const postContent = response.contents.find(
          c => c.uri === `openapi://endpoint/post/${path}`
        );
        expect(postContent).toBeDefined();
        const postOperation = JSON.parse(postContent!.text) as EndpointResponse;
        expect(isEndpointErrorResponse(postOperation)).toBe(false);

        // PUT operation should have error
        const putContent = response.contents.find(c => c.uri === `openapi://endpoint/put/${path}`);
        expect(putContent).toBeDefined();
        const putOperation = JSON.parse(putContent!.text) as EndpointResponse;
        expect(isEndpointErrorResponse(putOperation)).toBe(true);
      });
    });

    describe('List Endpoints Resource', () => {
      it('should return formatted list of endpoints', async () => {
        const response = (await client.readResource({
          uri: 'openapi://endpoints/list',
        })) as ResourceResponse;

        expect(response.contents).toHaveLength(1);
        const content = response.contents[0];
        expect(content.mimeType).toBe('text/plain');
        expect(content.text).toBe(
          'GET POST /api/v1/organizations/{orgId}/projects/{projectId}/tasks'
        );
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
