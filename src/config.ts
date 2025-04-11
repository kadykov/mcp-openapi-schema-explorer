/**
 * Configuration management for the OpenAPI Explorer MCP server
 */

import { OutputFormat } from './services/formatters.js';

/** Server configuration */
export interface ServerConfig {
  /** Path to OpenAPI specification file */
  specPath: string;
  /** Output format for responses */
  outputFormat: OutputFormat;
}

/** Load server configuration from command line arguments */
export function loadConfig(specPath?: string, options?: { outputFormat?: string }): ServerConfig {
  if (!specPath) {
    throw new Error(
      'OpenAPI spec path is required. Usage: npx mcp-openapi-schema-explorer <path-to-spec> [--output-format json|yaml]'
    );
  }

  const format = options?.outputFormat || 'json';
  if (format !== 'json' && format !== 'yaml' && format !== 'json-minified') {
    throw new Error('Invalid output format. Supported formats: json, yaml, json-minified');
  }

  return {
    specPath,
    // Cast is safe here due to the validation above
    outputFormat: format as OutputFormat,
  };
}
