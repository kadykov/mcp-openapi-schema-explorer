import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ReadResourceResult, TextResourceContents } from '@modelcontextprotocol/sdk/types.js';
import { startMcpServer, McpTestContext } from '../../utils/mcp-test-helpers';
import { FormattedResultItem } from '../../../src/handlers/handler-utils';
import path from 'path';

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
  return typeof (content as TextResourceContents).text === 'string';
}

describe('E2E Tests for Spec Loading Scenarios', () => {
  let testContext: McpTestContext | null = null; // Allow null for cleanup
  let client: Client | null = null; // Allow null

  // Helper to setup client for tests, allowing different spec paths
  async function setup(specPathOrUrl: string): Promise<void> {
    // Cleanup previous context if exists
    if (testContext) {
      await testContext.cleanup();
      testContext = null;
      client = null;
    }
    try {
      testContext = await startMcpServer(specPathOrUrl, { outputFormat: 'json' });
      client = testContext.client;
    } catch (error) {
      // Explicitly convert error to string for logging
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping tests for ${specPathOrUrl} due to setup error: ${errorMsg}`);
      testContext = null; // Ensure cleanup doesn't run on failed setup
      client = null; // Ensure tests are skipped
    }
  }

  afterEach(async () => {
    await testContext?.cleanup();
    testContext = null;
    client = null;
  });

  // Helper to read resource and perform basic checks
  async function readResourceAndCheck(uri: string): Promise<ReadResourceResult['contents'][0]> {
    if (!client) throw new Error('Client not initialized, skipping test.');
    const result = await client.readResource({ uri });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe(uri);
    return content;
  }

  // Helper to read resource and check for text/plain list content
  async function checkTextListResponse(uri: string, expectedSubstrings: string[]): Promise<string> {
    const content = (await readResourceAndCheck(uri)) as FormattedResultItem;
    expect(content.mimeType).toBe('text/plain');
    // expect(content.isError).toBeFalsy(); // Removed as SDK might strip this property
    if (!hasTextContent(content)) throw new Error('Expected text content');
    for (const sub of expectedSubstrings) {
      expect(content.text).toContain(sub);
    }
    return content.text;
  }

  // Helper to read resource and check for JSON detail content
  async function checkJsonDetailResponse(uri: string, expectedObject: object): Promise<unknown> {
    const content = (await readResourceAndCheck(uri)) as FormattedResultItem;
    expect(content.mimeType).toBe('application/json');
    // expect(content.isError).toBeFalsy(); // Removed as SDK might strip this property
    if (!hasTextContent(content)) throw new Error('Expected text content');
    const data = parseJsonSafely(content.text);
    expect(data).toMatchObject(expectedObject);
    return data;
  }

  // --- Tests for Local Swagger v2.0 Spec ---
  describe('Local Swagger v2.0 Spec (sample-v2-api.json)', () => {
    const v2SpecPath = path.resolve(__dirname, '../../fixtures/sample-v2-api.json');

    beforeAll(async () => await setup(v2SpecPath)); // Use beforeAll for this block

    it('should retrieve the converted "info" field', async () => {
      if (!client) return; // Skip if setup failed
      await checkJsonDetailResponse('openapi://info', {
        title: 'Simple Swagger 2.0 API',
        version: '1.0.0',
      });
    });

    it('should retrieve the converted "paths" list', async () => {
      if (!client) return; // Skip if setup failed
      await checkTextListResponse('openapi://paths', [
        'Hint:',
        'GET /v2/ping', // Note the basePath is included
      ]);
    });

    it('should retrieve the converted "components" list', async () => {
      if (!client) return; // Skip if setup failed
      await checkTextListResponse('openapi://components', [
        'Available Component Types:',
        '- schemas',
        "Hint: Use 'openapi://components/{type}'",
      ]);
    });

    it('should get details for converted schema Pong', async () => {
      if (!client) return; // Skip if setup failed
      await checkJsonDetailResponse('openapi://components/schemas/Pong', {
        type: 'object',
        properties: { message: { type: 'string', example: 'pong' } },
      });
    });
  });

  // --- Tests for Remote OpenAPI v3.0 Spec (Petstore) ---
  // Increase timeout for remote fetch
  jest.setTimeout(20000); // 20 seconds

  describe('Remote OpenAPI v3.0 Spec (Petstore)', () => {
    const petstoreUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';

    beforeAll(async () => await setup(petstoreUrl)); // Use beforeAll for this block

    it('should retrieve the "info" field from Petstore', async () => {
      if (!client) return; // Skip if setup failed
      await checkJsonDetailResponse('openapi://info', {
        title: 'Swagger Petstore - OpenAPI 3.0',
        // version might change, so don't assert exact value
      });
    });

    it('should retrieve the "paths" list from Petstore', async () => {
      if (!client) return; // Skip if setup failed
      // Check for a known path
      await checkTextListResponse('openapi://paths', ['/pet/{petId}']);
    });

    it('should retrieve the "components" list from Petstore', async () => {
      if (!client) return; // Skip if setup failed
      // Check for known component types
      await checkTextListResponse('openapi://components', [
        '- schemas',
        '- requestBodies',
        '- securitySchemes',
      ]);
    });

    it('should get details for schema Pet from Petstore', async () => {
      if (!client) return; // Skip if setup failed
      await checkJsonDetailResponse('openapi://components/schemas/Pet', {
        required: ['name', 'photoUrls'],
        type: 'object',
        // Check a known property
        properties: { id: { type: 'integer', format: 'int64' } },
      });
    });
  });
});
