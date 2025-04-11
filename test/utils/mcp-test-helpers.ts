import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

// Export the interface
export interface McpTestContext {
  client: Client;
  transport: StdioClientTransport;
  cleanup: () => Promise<void>;
}

interface StartServerOptions {
  outputFormat?: 'json' | 'yaml';
}

/**
 * Start MCP server with test configuration
 */
export async function startMcpServer(
  specPath: string,
  options: StartServerOptions = {}
): Promise<McpTestContext> {
  let transport: StdioClientTransport | undefined;
  let client: Client | undefined;

  try {
    // Initialize transport with spec path as argument
    transport = new StdioClientTransport({
      command: 'node',
      args: [
        'dist/src/index.js',
        path.resolve(specPath),
        ...(options.outputFormat ? ['--output-format', options.outputFormat] : []),
      ],
      stderr: 'inherit', // Pass through server errors normally - they're part of E2E testing
    });

    // Initialize client
    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    });

    await client.connect(transport);

    // Create cleanup function
    const cleanup = async (): Promise<void> => {
      if (transport) {
        await transport.close();
      }
    };

    return {
      client,
      transport,
      cleanup,
    };
  } catch (error) {
    // Clean up on error
    if (transport) {
      await transport.close();
    }
    throw error;
  }
}
