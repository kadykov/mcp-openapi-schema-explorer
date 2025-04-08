#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'node:fs/promises';
import { OpenAPISpec, OperationObject } from './types.js';

// Config validation
const requiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
};

// Get OpenAPI spec path from environment
const OPENAPI_SPEC_PATH = requiredEnvVar('OPENAPI_SPEC_PATH');

// Create MCP server
const server = new McpServer({
  name: 'openapi-explorer',
  version: '1.0.0'
});

// Server state
let specData: OpenAPISpec | null = null;

// Load OpenAPI spec
async function loadSpec(): Promise<void> {
  const content = await fs.readFile(OPENAPI_SPEC_PATH, 'utf-8');
  specData = JSON.parse(content) as OpenAPISpec;
}

// Format operation details as Markdown
function formatOperation(method: string, path: string, operation: OperationObject): string {
  const lines: string[] = [
    `# ${method.toUpperCase()} ${path}`,
    ''
  ];

  if (operation.summary) {
    lines.push(operation.summary, '');
  }

  // Parameters
  if (operation.parameters?.length) {
    const pathParams = operation.parameters.filter(p => p.in === 'path');
    const queryParams = operation.parameters.filter(p => p.in === 'query');
    
    if (pathParams.length > 0) {
      lines.push('## Path Parameters', '');
      for (const param of pathParams) {
        lines.push(`- \`${param.name}\` (${param.schema.type})${param.required ? ' (required)' : ''}`);
      }
      lines.push('');
    }

    if (queryParams.length > 0) {
      lines.push('## Query Parameters', '');
      for (const param of queryParams) {
        lines.push(`- \`${param.name}\` (${param.schema.type})${param.required ? ' (required)' : ''}`);
      }
      lines.push('');
    }
  }

  // Request Body
  if (operation.requestBody) {
    lines.push('## Request Body', '');
    const content = operation.requestBody.content['application/json'];
    if (content?.schema) {
      if ('$ref' in content.schema) {
        lines.push(`Schema: \`${content.schema.$ref}\``, '');
      } else {
        lines.push('Schema:', content.schema.type || 'object', '');
      }
    }
  }

  // Response
  lines.push('## Responses', '');
  for (const [code, response] of Object.entries(operation.responses)) {
    lines.push(`### ${code}`, '');
    lines.push(response.description || 'No description provided', '');

    const content = response.content?.['application/json'];
    if (content?.schema) {
      if ('$ref' in content.schema) {
        lines.push(`Schema: \`${content.schema.$ref}\``, '');
      } else {
        lines.push('Schema:', content.schema.type || 'object', '');
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Endpoint resource
server.resource(
  'endpoint',
  new ResourceTemplate('openapi://endpoint/{method}/{path}', { list: undefined }),
  { mimeType: 'text/markdown' },
  async (uri, params) => {
    try {
      const { method, path: encodedPath } = params as { method: string; path: string };
      
      // Decode once to get the actual path
      const decodedPath = '/' + decodeURIComponent(encodedPath);

      // For debugging
      console.error('Method:', method);
      console.error('Encoded Path:', encodedPath);
      console.error('Decoded Path:', decodedPath);

      // Get operation from OpenAPI spec
      const pathItem = specData?.paths?.[decodedPath];
      const operation = pathItem?.[method.toLowerCase() as keyof typeof pathItem];

      if (!operation) {
        throw new Error(`Endpoint not found: ${method} ${decodedPath}`);
      }

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: formatOperation(method, decodedPath, operation)
        }]
      };
    } catch (error) {
      // Log any errors for debugging
      console.error('Error:', error);
      throw error;
    }
  }
);

// Start server
await loadSpec();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('OpenAPI Explorer MCP server running on stdio');
