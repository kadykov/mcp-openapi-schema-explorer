import fs from 'node:fs/promises';
import path from 'path';

// Extend timeout for E2E tests
jest.setTimeout(30000);

// Clean up any previous test artifacts
beforeAll(async () => {
  // Create required directories if they don't exist
  const dirs = ['dist', 'dist/src', 'test/fixtures'];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
      if ((error as { code?: string }).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  // Verify sample OpenAPI spec exists
  const specPath = path.resolve(process.cwd(), 'test/fixtures/sample-api.json');
  try {
    await fs.access(specPath);
  } catch {
    throw new Error(`Sample OpenAPI spec not found at ${specPath}`);
  }
});

// Custom matchers could be added here if needed
