import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

interface McpTestContext {
  client: Client;
  transport: StdioClientTransport;
  cleanup: () => Promise<void>;
}

/**
 * Start MCP server with test configuration
 */
export async function startMcpServer(specPath: string): Promise<McpTestContext> {
  let transport: StdioClientTransport | undefined;
  let client: Client | undefined;

  try {
    // Initialize transport with spec path as argument
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/src/index.js', path.resolve(process.cwd(), specPath)],
      stderr: 'inherit', // Show server errors in test output
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
