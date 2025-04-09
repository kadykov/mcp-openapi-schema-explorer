/**
 * Configuration management for the OpenAPI Explorer MCP server
 */

/** Server configuration */
export interface ServerConfig {
  /** Path to OpenAPI specification file */
  specPath: string;
}

/** Load server configuration from command line argument */
export function loadConfig(specPath?: string): ServerConfig {
  if (!specPath) {
    throw new Error(
      'OpenAPI spec path is required. Usage: npx mcp-openapi-schema-explorer <path-to-spec>'
    );
  }

  return {
    specPath,
  };
}
