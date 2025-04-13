# MCP OpenAPI Schema Explorer Installation Guide

This guide is specifically designed for AI agents like Cline to install and configure the MCP OpenAPI Schema Explorer server using the recommended `npx` method.

## Prerequisites

1.  Node.js (Latest LTS version recommended)
2.  Access to an OpenAPI v3.0 or Swagger v2.0 specification file, either via a local file path or a remote HTTP/HTTPS URL.

## Installation Steps (Recommended: npx)

### 1. Configuration Setup

The MCP OpenAPI Schema Explorer server is typically run using `npx` directly within the MCP client configuration. This avoids global installation.

#### For Cline (or similar MCP clients)

1.  Create or modify the MCP configuration file:

    ```json
    {
      "mcpServers": {
        "My API Spec": {
          "command": "npx",
          "args": [
            "-y",
            "mcp-openapi-schema-explorer@latest",
            "<path-or-url-to-spec>",
            "--output-format",
            "yaml"
          ],
          "env": {}
        }
      }
    }
    ```

2.  **Replace `"My API Spec"`:** Choose a descriptive name for this server instance. This is how you'll identify it within your MCP client.
3.  **Replace `<path-or-url-to-spec>`:** Provide the **required** absolute local file path (e.g., `/path/to/your/api.yaml`) or the full remote URL (e.g., `https://petstore3.swagger.io/api/v3/openapi.json`) of your OpenAPI/Swagger specification.
4.  **(Optional)** Change the `--output-format` value. Supported formats are:
    - `yaml` (Recommended for token efficiency)
    - `json` (Default if omitted)
    - `json-minified`

**Note on Multiple Specifications:** This server handles one specification per instance. To explore multiple specifications, configure multiple entries under `mcpServers` in your client's configuration file, each pointing to a different spec file/URL and using a unique server name key (like `"My API Spec"`).

### 2. Verification

To verify the installation:

1.  The server should appear in the list of available MCP servers within your client (e.g., named "My API Spec" or whatever key you used). The server name might dynamically update based on the spec's `info.title` (e.g., "Schema Explorer for Petstore API").
2.  Test the connection by accessing a basic resource, for example:
    ```
    /mcp "My API Spec" access openapi://info
    ```
    (Replace `"My API Spec"` with the exact key you used in the configuration).

## Alternative Usage Methods

While `npx` is recommended for AI agents, the server can also be run using:

- **Docker:** See the [Usage with Docker](https://github.com/kadykov/mcp-openapi-schema-explorer#usage-with-docker) section in the main README for detailed instructions on running the container and configuring your MCP client.
- **Global npm Install:** Less common, see the [Alternative: Global Installation](https://github.com/kadykov/mcp-openapi-schema-explorer#alternative-global-installation-less-common) section in the main README.

## Troubleshooting

Common issues and solutions:

1.  **Server Fails to Start:**
    - Verify the `<path-or-url-to-spec>` is correct, accessible, and properly quoted in the JSON configuration.
    - Ensure the specification file is a valid OpenAPI v3.0 or Swagger v2.0 document (JSON or YAML).
    - Check Node.js version (LTS recommended).
    - For remote URLs, check network connectivity.
2.  **Resources Not Loading or Errors:**
    - Double-check the resource URI syntax (e.g., `openapi://paths`, `openapi://components/schemas/MySchema`). Remember that path segments in URIs need URL encoding (e.g., `/users/{id}` becomes `users%2F%7Bid%7D`).
    - Ensure the requested path, method, or component exists in the specification.

## Environment Variables

No environment variables are required for the server to operate.

## Additional Notes

- The server automatically handles loading specs from local files or remote URLs.
- Swagger v2.0 specifications are automatically converted to OpenAPI v3.0 internally.
- Internal references (`#/components/...`) are transformed into clickable MCP URIs (`openapi://components/...`).
- The server name displayed in the client might be dynamically generated from the specification's title.

## Support

If you encounter any issues:

1.  Check the project's main README for more details: [https://github.com/kadykov/mcp-openapi-schema-explorer#readme](https://github.com/kadykov/mcp-openapi-schema-explorer#readme)
2.  Submit an issue on GitHub: [https://github.com/kadykov/mcp-openapi-schema-explorer/issues](https://github.com/kadykov/mcp-openapi-schema-explorer/issues)

---

This installation guide focuses on the `npx` method for AI agents. Refer to the main project README for comprehensive documentation.
