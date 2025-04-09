import { dump as yamlDump } from 'js-yaml';
import {
  JsonFormatter,
  YamlFormatter,
  createFormatter,
} from '../../../../src/services/formatters.js';

describe('Formatters', () => {
  const testData = {
    method: 'GET',
    path: '/test',
    summary: 'Test endpoint',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
  };

  describe('JsonFormatter', () => {
    const formatter = new JsonFormatter();

    it('should format data as JSON with proper indentation', () => {
      const result = formatter.format(testData);
      expect(result).toBe(JSON.stringify(testData, null, 2));
    });

    it('should return application/json mime type', () => {
      expect(formatter.getMimeType()).toBe('application/json');
    });

    it('should handle empty objects', () => {
      expect(formatter.format({})).toBe('{}');
    });

    it('should handle null values', () => {
      expect(formatter.format(null)).toBe('null');
    });
  });

  describe('YamlFormatter', () => {
    const formatter = new YamlFormatter();

    it('should format data as YAML', () => {
      const result = formatter.format(testData);
      expect(result).toBe(
        yamlDump(testData, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
        })
      );
    });

    it('should return text/yaml mime type', () => {
      expect(formatter.getMimeType()).toBe('text/yaml');
    });

    it('should handle empty objects', () => {
      expect(formatter.format({})).toBe('{}\n');
    });

    it('should handle null values', () => {
      expect(formatter.format(null)).toBe('null\n');
    });
  });

  describe('createFormatter', () => {
    it('should create JsonFormatter for json format', () => {
      const formatter = createFormatter('json');
      expect(formatter).toBeInstanceOf(JsonFormatter);
    });

    it('should create YamlFormatter for yaml format', () => {
      const formatter = createFormatter('yaml');
      expect(formatter).toBeInstanceOf(YamlFormatter);
    });
  });
});
