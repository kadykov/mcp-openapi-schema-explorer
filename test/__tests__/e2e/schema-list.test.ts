import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { startMcpServer } from '../../utils/mcp-test-helpers.js';
import type { ResourceResponse } from '../../utils/test-types.js'; // Assuming ResourceResponse is defined here

describe('E2E: Schema List Resource (openapi://schemas/list)', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  // Setup for tests using the sample spec
  describe('with sample-api.json', () => {
    beforeEach(async () => {
      // Use the helper to start the server with the specific fixture
      const context = await startMcpServer('test/fixtures/sample-api.json');
      client = context.client;
      cleanup = context.cleanup;
    });

    afterEach(async () => {
      // Ensure cleanup happens after each test in this block
      if (cleanup) {
        await cleanup();
      }
    });

    it('should return a sorted list of schema names in text/plain format', async () => {
      const response = (await client.readResource({
        uri: 'openapi://schemas/list',
      })) as ResourceResponse; // Cast to expected type

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];

      expect(content.mimeType).toBe('text/plain');
      expect(content.uri).toBe('openapi://schemas/list');
      // Check for absence of error prefix in successful response
      expect(content.text.startsWith('Error:')).toBe(false);

      // Check the text content - should be sorted alphabetically based on sample-api.json
      const expectedSchemas = ['User', 'UserList'].sort().join('\n'); // Ensure expected list is also sorted
      expect(content.text).toBe(expectedSchemas);
    });
  });

  // Setup for tests using an empty spec
  describe('with empty-api.json', () => {
    beforeEach(async () => {
      // Use the helper to start the server with the empty fixture
      const context = await startMcpServer('test/fixtures/empty-api.json');
      client = context.client;
      cleanup = context.cleanup;
    });

    afterEach(async () => {
      // Ensure cleanup happens after each test in this block
      if (cleanup) {
        await cleanup();
      }
    });

    it('should return an empty string for a spec with no schemas', async () => {
      const response = (await client.readResource({
        uri: 'openapi://schemas/list',
      })) as ResourceResponse; // Cast to expected type

      expect(response.contents).toHaveLength(1);
      const content = response.contents[0];

      expect(content.mimeType).toBe('text/plain');
      expect(content.uri).toBe('openapi://schemas/list');
      // Check for absence of error prefix in successful response (empty string is success here)
      expect(content.text.startsWith('Error:')).toBe(false);
      expect(content.text).toBe(''); // Expect empty string for no schemas
    });
  });

  // Add more describe blocks if needed for other specs (e.g., non-v3, invalid)
  // Example:
  // describe('with invalid-spec.json', () => { ... });
});
