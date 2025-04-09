import { loadConfig } from '../../../src/config.js';

describe('Config', () => {
  describe('loadConfig', () => {
    it('returns valid configuration with default format when only path is provided', () => {
      const config = loadConfig('/path/to/spec.json');
      expect(config).toEqual({
        specPath: '/path/to/spec.json',
        outputFormat: 'json',
      });
    });

    it('returns valid configuration when path and format are provided', () => {
      const config = loadConfig('/path/to/spec.json', { outputFormat: 'yaml' });
      expect(config).toEqual({
        specPath: '/path/to/spec.json',
        outputFormat: 'yaml',
      });
    });

    it('throws error when invalid format is provided', () => {
      expect(() => loadConfig('/path/to/spec.json', { outputFormat: 'invalid' })).toThrow(
        'Invalid output format. Supported formats: json, yaml'
      );
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
