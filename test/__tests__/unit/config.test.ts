import { loadConfig } from '../../../src/config.js';

describe('Config', () => {
  describe('loadConfig', () => {
    it('returns valid configuration when path is provided', () => {
      const config = loadConfig('/path/to/spec.json');
      expect(config).toEqual({
        specPath: '/path/to/spec.json',
      });
    });

    it('throws error when path is not provided', () => {
      expect(() => loadConfig()).toThrow(
        'OpenAPI spec path is required. Usage: npx mcp-openapi-schema-explorer <path-to-spec>'
      );
    });

    it('throws error when path is empty string', () => {
      expect(() => loadConfig('')).toThrow(
        'OpenAPI spec path is required. Usage: npx mcp-openapi-schema-explorer <path-to-spec>'
      );
    });
  });
});
