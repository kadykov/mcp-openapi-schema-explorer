# Using MCP OpenAPI Schema Explorer with Claude Code

This guide provides step-by-step instructions for using the MCP OpenAPI Schema Explorer with [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code), Anthropic's CLI tool for coding with Claude.

## What is Claude Code?

Claude Code is a command-line tool that lets you interact with Claude directly from your terminal. It supports MCP (Model Context Protocol) servers, allowing Claude to access external tools and data sources like OpenAPI specifications.

## Prerequisites

1. **Install Claude Code CLI**: Follow the [official installation instructions](https://docs.anthropic.com/en/docs/build-with-claude/claude-code)
2. **Verify installation**: Run `claude --version` in your terminal

## Adding the MCP Server to Claude Code

Claude Code provides a convenient CLI command to add MCP servers: `claude mcp add`

### Method 1: Using npx (Recommended)

This method automatically downloads and runs the latest version without requiring installation:

```bash
# For a remote API specification
claude mcp add my-api -- npx -y mcp-openapi-schema-explorer@latest https://petstore3.swagger.io/api/v3/openapi.json

# For a local API specification (use absolute path)
claude mcp add my-api -- npx -y mcp-openapi-schema-explorer@latest /path/to/your/openapi.json

# With custom output format (yaml)
claude mcp add my-api -- npx -y mcp-openapi-schema-explorer@latest https://api.example.com/openapi.json --output-format yaml
```

### Method 2: Using Node.js (Local Development)

If you're developing or testing a local version:

```bash
# First, build the project
cd /path/to/mcp-openapi-schema-explorer
npm install
npm run build

# Then add to Claude Code
claude mcp add my-api -- node /path/to/mcp-openapi-schema-explorer/dist/src/index.js /path/to/spec.json
```

### Method 3: Using Docker

For containerized deployments:

```bash
# For remote URL
claude mcp add my-api -- docker run --rm -i kadykov/mcp-openapi-schema-explorer:latest https://petstore3.swagger.io/api/v3/openapi.json

# For local file (requires volume mounting)
claude mcp add my-api -- docker run --rm -i -v /full/host/path/to/spec.yaml:/spec/api.yaml kadykov/mcp-openapi-schema-explorer:latest /spec/api.yaml
```

## Managing MCP Servers

### List configured servers

```bash
claude mcp list
```

This command shows all configured MCP servers and their connection status.

### Get server details

```bash
claude mcp get my-api
```

### Remove a server

```bash
claude mcp remove my-api
```

## Using the MCP Server with Claude Code

Once the MCP server is configured, you can interact with it in your Claude Code sessions:

### Interactive Mode

```bash
claude
```

Then ask Claude questions like:

- "Using the my-api MCP server, list all available API endpoints"
- "Show me the details of the GET /users endpoint from the my-api server"
- "What are all the component schemas available in the my-api server?"
- "Show me the User schema definition"

### Print Mode (Non-interactive)

Use the `-p` or `--print` flag for single-query responses:

```bash
claude -p "Using the my-api MCP server, list all available endpoints"
```

This is useful for scripting or quick queries.

## Resource Templates

The MCP OpenAPI Schema Explorer uses **resource templates** to provide structured access to different parts of the OpenAPI specification. Here are the available templates:

### Top-Level Fields

- **URI**: `openapi://{field}`
- **Examples**: `openapi://info`, `openapi://servers`, `openapi://paths`, `openapi://components`
- **Usage**: "Show me the info section from the my-api server"

### List Path Methods

- **URI**: `openapi://paths/{path}`
- **Examples**: `openapi://paths/%2Fusers` (for `/users`)
- **Note**: Paths must be URL-encoded
- **Usage**: "List all HTTP methods available for the /users path"

### Get Operation Details

- **URI**: `openapi://paths/{path}/{method}`
- **Examples**: `openapi://paths/%2Fusers/get`, `openapi://paths/%2Fusers/get,post`
- **Usage**: "Show me the details of the GET /users endpoint"

### List Component Names

- **URI**: `openapi://components/{type}`
- **Examples**: `openapi://components/schemas`, `openapi://components/responses`
- **Usage**: "List all available schemas"

### Get Component Details

- **URI**: `openapi://components/{type}/{name}`
- **Examples**: `openapi://components/schemas/User`, `openapi://components/schemas/User,Order`
- **Usage**: "Show me the User schema"

## Configuration File

Claude Code stores MCP server configurations in `~/.claude.json` under the `projects` section. Here's an example of what it looks like:

```json
{
  "projects": {
    "/path/to/your/project": {
      "mcpServers": {
        "my-api": {
          "type": "stdio",
          "command": "npx",
          "args": [
            "-y",
            "mcp-openapi-schema-explorer@latest",
            "https://petstore3.swagger.io/api/v3/openapi.json",
            "--output-format",
            "yaml"
          ],
          "env": {}
        }
      }
    }
  }
}
```

## Tips and Best Practices

1. **Use descriptive names**: When adding servers, use names that clearly identify the API (e.g., `petstore-api`, `stripe-api`)

2. **Multiple APIs**: You can add multiple MCP servers for different APIs:

   ```bash
   claude mcp add petstore -- npx -y mcp-openapi-schema-explorer@latest https://petstore3.swagger.io/api/v3/openapi.json
   claude mcp add stripe -- npx -y mcp-openapi-schema-explorer@latest https://api.stripe.com/v1/openapi.json
   ```

3. **Output formats**: Choose the format that works best for your use case:
   - `--output-format json` (default): Standard JSON formatting
   - `--output-format yaml`: YAML formatting (more human-readable)
   - `--output-format json-minified`: Minified JSON (saves tokens)

4. **URL encoding**: When constructing URIs manually, remember to URL-encode paths:
   - `/users/{id}` becomes `%2Fusers%2F%7Bid%7D`
   - You typically don't need to do this manually when asking Claude in natural language

5. **Check connection status**: Run `claude mcp list` periodically to ensure your servers are connected

## Troubleshooting

### Server not connecting

If `claude mcp list` shows a server as not connected:

1. Verify the command works standalone:

   ```bash
   npx -y mcp-openapi-schema-explorer@latest https://petstore3.swagger.io/api/v3/openapi.json
   ```

2. Check the specification URL or file path is valid

3. Remove and re-add the server:
   ```bash
   claude mcp remove my-api
   claude mcp add my-api -- npx -y mcp-openapi-schema-explorer@latest <your-spec-url>
   ```

### Permission issues

If you encounter permission errors, ensure:

- File paths are absolute (not relative)
- You have read access to local specification files
- Remote URLs are accessible from your network

### Debug mode

Enable debug mode to see detailed MCP communication:

```bash
claude -d "Using the my-api server, list all endpoints"
```

## Examples

### Example 1: Exploring the Petstore API

```bash
# Add the Petstore API
claude mcp add petstore -- npx -y mcp-openapi-schema-explorer@latest https://petstore3.swagger.io/api/v3/openapi.json

# Query it
claude -p "Using the petstore server, what are all the pet-related endpoints?"
```

### Example 2: Working with a local API spec

```bash
# Add your local API
claude mcp add my-service -- npx -y mcp-openapi-schema-explorer@latest /home/user/projects/my-api/openapi.yaml --output-format yaml

# Interactive exploration
claude
# Then ask: "Using the my-service server, show me all available endpoints and their operations"
```

### Example 3: Multiple APIs

```bash
# Add multiple APIs
claude mcp add github -- npx -y mcp-openapi-schema-explorer@latest https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json
claude mcp add gitlab -- npx -y mcp-openapi-schema-explorer@latest https://gitlab.com/api/v4/openapi.json

# Compare them
claude -p "Compare the authentication methods used by the github and gitlab MCP servers"
```

## Further Resources

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/build-with-claude/claude-code)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP OpenAPI Schema Explorer Repository](https://github.com/kadykov/mcp-openapi-schema-explorer)

## Feedback

If you encounter issues specific to Claude Code integration, please:

1. Check the [GitHub Issues](https://github.com/kadykov/mcp-openapi-schema-explorer/issues)
2. Open a new issue with:
   - Claude Code version (`claude --version`)
   - Your MCP server configuration
   - Error messages or unexpected behavior
   - Steps to reproduce
