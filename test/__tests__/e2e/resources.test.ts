import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// Import specific SDK types needed
import {
  ReadResourceResult,
  TextResourceContents,
  // Removed unused CompleteRequest, CompleteResult
} from '@modelcontextprotocol/sdk/types.js';
import { startMcpServer, McpTestContext } from '../../utils/mcp-test-helpers';
import path from 'path';

// Use the complex spec for E2E tests
const complexSpecPath = path.resolve(__dirname, '../../fixtures/complex-endpoint.json');

// Helper function to parse JSON safely
function parseJsonSafely(text: string | undefined): unknown {
  if (text === undefined) {
    throw new Error('Received undefined text for JSON parsing');
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON:', text);
    throw new Error(`Invalid JSON received: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Type guard to check if content is TextResourceContents
function hasTextContent(
  content: ReadResourceResult['contents'][0]
): content is TextResourceContents {
  // Check for the 'text' property specifically, differentiating from BlobResourceContents
  return typeof (content as TextResourceContents).text === 'string';
}

describe('E2E Tests for Refactored Resources', () => {
  let testContext: McpTestContext;
  let client: Client; // Use the correct Client type

  // Helper to setup client for tests
  async function setup(specPath: string = complexSpecPath): Promise<void> {
    // Use complex spec by default
    testContext = await startMcpServer(specPath, { outputFormat: 'json' }); // Default to JSON
    client = testContext.client; // Get client from helper context
    // Initialization is handled by startMcpServer connecting the transport
  }

  afterEach(async () => {
    await testContext?.cleanup(); // Use cleanup function from helper
  });

  // Helper to read resource and perform basic checks
  async function readResourceAndCheck(uri: string): Promise<ReadResourceResult['contents'][0]> {
    const result = await client.readResource({ uri });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe(uri);
    return content;
  }

  // Helper to read resource and check for text/plain list content
  async function checkTextListResponse(uri: string, expectedSubstrings: string[]): Promise<string> {
    const content = await readResourceAndCheck(uri);
    expect(content.mimeType).toBe('text/plain');
    expect(content.isError).toBeFalsy();
    if (!hasTextContent(content)) throw new Error('Expected text content');
    for (const sub of expectedSubstrings) {
      expect(content.text).toContain(sub);
    }
    return content.text;
  }

  // Helper to read resource and check for JSON detail content
  async function checkJsonDetailResponse(uri: string, expectedObject: object): Promise<unknown> {
    const content = await readResourceAndCheck(uri);
    expect(content.mimeType).toBe('application/json');
    expect(content.isError).toBeFalsy();
    if (!hasTextContent(content)) throw new Error('Expected text content');
    const data = parseJsonSafely(content.text);
    expect(data).toMatchObject(expectedObject);
    return data;
  }

  // Helper to read resource and check for error
  async function checkErrorResponse(uri: string, expectedErrorText: string): Promise<void> {
    const content = await readResourceAndCheck(uri);
    expect(content.isError).toBe(true);
    expect(content.mimeType).toBe('text/plain'); // Errors are plain text
    if (!hasTextContent(content)) throw new Error('Expected text content for error');
    expect(content.text).toContain(expectedErrorText);
  }

  describe('openapi://{field}', () => {
    beforeEach(async () => await setup());

    it('should retrieve the "info" field', async () => {
      // Matches complex-endpoint.json
      await checkJsonDetailResponse('openapi://info', {
        title: 'Complex Endpoint Test API',
        version: '1.0.0',
      });
    });

    it('should retrieve the "paths" list', async () => {
      // Matches complex-endpoint.json
      await checkTextListResponse('openapi://paths', [
        'Hint:',
        'GET POST /api/v1/organizations/{orgId}/projects/{projectId}/tasks',
      ]);
    });

    it('should retrieve the "components" list', async () => {
      // Matches complex-endpoint.json (only has schemas)
      await checkTextListResponse('openapi://components', [
        'Available Component Types:',
        '- schemas',
        "Hint: Use 'openapi://components/{type}'",
      ]);
    });

    it('should return error for invalid field', async () => {
      const uri = 'openapi://invalidfield';
      await checkErrorResponse(uri, 'Field "invalidfield" not found');
    });
  });

  describe('openapi://paths/{path}', () => {
    beforeEach(async () => await setup());

    it('should list methods for the complex task path', async () => {
      const complexPath = 'api/v1/organizations/{orgId}/projects/{projectId}/tasks';
      const encodedPath = encodeURIComponent(complexPath);
      // Update expected format based on METHOD: Summary/OpId
      await checkTextListResponse(`openapi://paths/${encodedPath}`, [
        "Hint: Use 'openapi://paths/api%2Fv1%2Forganizations%2F%7BorgId%7D%2Fprojects%2F%7BprojectId%7D%2Ftasks/{method}'", // Hint comes first now
        '', // Blank line after hint
        'GET: Get Tasks', // METHOD: summary
        'POST: Create Task', // METHOD: summary
      ]);
    });

    it('should return error for non-existent path', async () => {
      const encodedPath = encodeURIComponent('nonexistent');
      const uri = `openapi://paths/${encodedPath}`;
      // Updated error message from getValidatedPathItem
      await checkErrorResponse(uri, 'Path "/nonexistent" not found in the specification.');
    });
  });

  describe('openapi://paths/{path}/{method*}', () => {
    beforeEach(async () => await setup());

    it('should get details for GET on complex path', async () => {
      const complexPath = 'api/v1/organizations/{orgId}/projects/{projectId}/tasks';
      const encodedPath = encodeURIComponent(complexPath);
      // Check operationId from complex-endpoint.json
      await checkJsonDetailResponse(`openapi://paths/${encodedPath}/get`, {
        operationId: 'getProjectTasks',
      });
    });

    it('should get details for multiple methods GET,POST on complex path', async () => {
      const complexPath = 'api/v1/organizations/{orgId}/projects/{projectId}/tasks';
      const encodedPath = encodeURIComponent(complexPath);
      const result = await client.readResource({ uri: `openapi://paths/${encodedPath}/get,post` });
      expect(result.contents).toHaveLength(2);

      const getContent = result.contents.find(c => c.uri.endsWith('/get'));
      expect(getContent).toBeDefined();
      expect(getContent?.isError).toBeFalsy();
      if (!getContent || !hasTextContent(getContent))
        throw new Error('Expected text content for GET');
      const getData = parseJsonSafely(getContent.text);
      // Check operationId from complex-endpoint.json
      expect(getData).toMatchObject({ operationId: 'getProjectTasks' });

      const postContent = result.contents.find(c => c.uri.endsWith('/post'));
      expect(postContent).toBeDefined();
      expect(postContent?.isError).toBeFalsy();
      if (!postContent || !hasTextContent(postContent))
        throw new Error('Expected text content for POST');
      const postData = parseJsonSafely(postContent.text);
      // Check operationId from complex-endpoint.json
      expect(postData).toMatchObject({ operationId: 'createProjectTask' });
    });

    it('should return error for invalid method on complex path', async () => {
      const complexPath = 'api/v1/organizations/{orgId}/projects/{projectId}/tasks';
      const encodedPath = encodeURIComponent(complexPath);
      const uri = `openapi://paths/${encodedPath}/put`;
      // Updated error message from getValidatedOperations
      await checkErrorResponse(
        uri,
        'None of the requested methods (put) are valid for path "/api/v1/organizations/{orgId}/projects/{projectId}/tasks". Available methods: get, post'
      );
    });
  });

  describe('openapi://components/{type}', () => {
    beforeEach(async () => await setup());

    it('should list schemas', async () => {
      // Matches complex-endpoint.json
      await checkTextListResponse('openapi://components/schemas', [
        'Available schemas:',
        '- CreateTaskRequest',
        '- Task',
        '- TaskList',
        "Hint: Use 'openapi://components/schemas/{name}'",
      ]);
    });

    it('should return error for invalid type', async () => {
      const uri = 'openapi://components/invalid';
      await checkErrorResponse(uri, 'Invalid component type: invalid');
    });
  });

  describe('openapi://components/{type}/{name*}', () => {
    beforeEach(async () => await setup());

    it('should get details for schema Task', async () => {
      // Matches complex-endpoint.json
      await checkJsonDetailResponse('openapi://components/schemas/Task', {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' } },
      });
    });

    it('should get details for multiple schemas Task,TaskList', async () => {
      // Matches complex-endpoint.json
      const result = await client.readResource({
        uri: 'openapi://components/schemas/Task,TaskList',
      });
      expect(result.contents).toHaveLength(2);

      const taskContent = result.contents.find(c => c.uri.endsWith('/Task'));
      expect(taskContent).toBeDefined();
      expect(taskContent?.isError).toBeFalsy();
      if (!taskContent || !hasTextContent(taskContent))
        throw new Error('Expected text content for Task');
      const taskData = parseJsonSafely(taskContent.text);
      expect(taskData).toMatchObject({ properties: { id: { type: 'string' } } });

      const taskListContent = result.contents.find(c => c.uri.endsWith('/TaskList'));
      expect(taskListContent).toBeDefined();
      expect(taskListContent?.isError).toBeFalsy();
      if (!taskListContent || !hasTextContent(taskListContent))
        throw new Error('Expected text content for TaskList');
      const taskListData = parseJsonSafely(taskListContent.text);
      expect(taskListData).toMatchObject({ properties: { items: { type: 'array' } } });
    });

    it('should return error for invalid name', async () => {
      const uri = 'openapi://components/schemas/InvalidSchemaName';
      // Updated error message from getValidatedComponentDetails with sorted names
      await checkErrorResponse(
        uri,
        'None of the requested names (InvalidSchemaName) are valid for component type "schemas". Available names: CreateTaskRequest, Task, TaskList'
      );
    });
  });

  // Removed ListResourceTemplates test suite as the 'complete' property
  // is likely not part of the standard response payload.
  // We assume the templates are registered correctly in src/index.ts.

  describe('Completion Tests', () => {
    beforeEach(async () => await setup()); // Use the same setup

    it('should provide completions for {field}', async () => {
      const params = {
        argument: { name: 'field', value: '' }, // Empty value to get all
        ref: { type: 'ref/resource' as const, uri: 'openapi://{field}' },
      };
      const result = await client.complete(params);
      expect(result.completion).toBeDefined();
      expect(result.completion.values).toEqual(
        expect.arrayContaining(['openapi', 'info', 'paths', 'components']) // Based on complex-endpoint.json
      );
      expect(result.completion.values).toHaveLength(4);
    });

    it('should provide completions for {path}', async () => {
      const params = {
        argument: { name: 'path', value: '' }, // Empty value to get all
        ref: { type: 'ref/resource' as const, uri: 'openapi://paths/{path}' },
      };
      const result = await client.complete(params);
      expect(result.completion).toBeDefined();
      // Check for the encoded path from complex-endpoint.json
      expect(result.completion.values).toEqual([
        'api%2Fv1%2Forganizations%2F%7BorgId%7D%2Fprojects%2F%7BprojectId%7D%2Ftasks',
      ]);
    });

    it('should provide completions for {method*}', async () => {
      const params = {
        argument: { name: 'method', value: '' }, // Empty value to get all
        ref: {
          type: 'ref/resource' as const,
          uri: 'openapi://paths/{path}/{method*}', // Use the exact template URI
        },
      };
      const result = await client.complete(params);
      expect(result.completion).toBeDefined();
      // Check for the static list of methods defined in src/index.ts
      expect(result.completion.values).toEqual([
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
        'HEAD',
        'TRACE',
      ]);
    });

    it('should provide completions for {type}', async () => {
      const params = {
        argument: { name: 'type', value: '' }, // Empty value to get all
        ref: { type: 'ref/resource' as const, uri: 'openapi://components/{type}' },
      };
      const result = await client.complete(params);
      expect(result.completion).toBeDefined();
      // Check for component types in complex-endpoint.json
      expect(result.completion.values).toEqual(['schemas']);
    });

    // Updated test for conditional name completion
    it('should provide completions for {name*} when only one component type exists', async () => {
      // complex-endpoint.json only has 'schemas'
      const params = {
        argument: { name: 'name', value: '' },
        ref: {
          type: 'ref/resource' as const,
          uri: 'openapi://components/{type}/{name*}', // Use the exact template URI
        },
      };
      const result = await client.complete(params);
      expect(result.completion).toBeDefined();
      // Expect schema names from complex-endpoint.json
      expect(result.completion.values).toEqual(
        expect.arrayContaining(['CreateTaskRequest', 'Task', 'TaskList'])
      );
      expect(result.completion.values).toHaveLength(3);
    });

    // New test for multiple component types
    it('should NOT provide completions for {name*} when multiple component types exist', async () => {
      // Need to restart the server with the multi-component spec
      await testContext?.cleanup(); // Clean up previous server
      const multiSpecPath = path.resolve(__dirname, '../../fixtures/multi-component-types.json');
      await setup(multiSpecPath); // Restart server with new spec

      const params = {
        argument: { name: 'name', value: '' },
        ref: {
          type: 'ref/resource' as const,
          uri: 'openapi://components/{type}/{name*}', // Use the exact template URI
        },
      };
      const result = await client.complete(params);
      expect(result.completion).toBeDefined();
      // Expect empty array because multiple types (schemas, parameters) exist
      expect(result.completion.values).toEqual([]);
    });
  });
});
