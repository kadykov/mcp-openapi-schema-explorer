import { dump as yamlDump } from 'js-yaml';

/**
 * Supported output formats
 */
export type OutputFormat = 'json' | 'yaml';

/**
 * Interface for formatters that handle different output formats
 */
export interface IFormatter {
  format(data: unknown): string;
  getMimeType(): string;
}

/**
 * JSON formatter with pretty printing
 */
export class JsonFormatter implements IFormatter {
  format(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  getMimeType(): string {
    return 'application/json';
  }
}

/**
 * YAML formatter using js-yaml library
 */
export class YamlFormatter implements IFormatter {
  format(data: unknown): string {
    return yamlDump(data, {
      indent: 2,
      lineWidth: -1, // Don't wrap long lines
      noRefs: true, // Don't use references
    });
  }

  getMimeType(): string {
    return 'text/yaml';
  }
}

/**
 * Creates a formatter instance based on format name
 */
export function createFormatter(format: OutputFormat): IFormatter {
  switch (format) {
    case 'json':
      return new JsonFormatter();
    case 'yaml':
      return new YamlFormatter();
  }
}
