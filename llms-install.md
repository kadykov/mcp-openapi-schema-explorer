# MCP OpenAPI Schema Explorer Usage Guide

This guide explains how to add the MCP OpenAPI Schema Explorer server to your MCP client (e.g., Claude Desktop, Windsurf, Cline). This involves adding a configuration entry to your client's settings file that tells the client how to run the server process. The server itself doesn't require separate configuration beyond the command-line arguments specified in the client settings.

## Prerequisites

1.  Node.js (Latest LTS version recommended) OR Docker installed.
2.  Access to an OpenAPI v3.0 or Swagger v2.0 specification file, either via a local file path or a remote HTTP/HTTPS URL.
3.  An MCP client application (e.g., Claude Desktop, Windsurf, Cline, etc.).

## Installation

For the recommended usage methods (`npx` and Docker, described below), **no separate installation step is required**. Your MCP client will download the package or pull the Docker image automatically based on the configuration you provide in its settings.

If you prefer to install the server explicitly:

- **Global Install:** Run `npm install -g mcp-openapi-schema-explorer`. See **Usage Method 3** for how to configure your client to use this.
- **Local Install (for Development):** Clone the repository (`git clone ...`), install dependencies (`npm install`), and build (`npm run build`). See **Usage Method 4** for how to configure your client to use this.

## Usage Method 1: npx (Recommended)

This is the recommended method as it avoids global/local installation and ensures you use the latest published version.

### Client Configuration Entry (npx Method)

Add the following JSON object to the `mcpServers` section of your MCP client's configuration file (e.g., `claude_desktop_config.json`). This entry instructs the client on how to run the server using `npx`:

```json
{
  "mcpServers": {
    "My API Spec (npx)": {
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

**Configuration Details:**

1.  **Replace `"My API Spec (npx)"`:** Choose a descriptive name for this server instance.
2.  **Replace `<path-or-url-to-spec>`:** Provide the **required** absolute local file path (e.g., `/path/to/your/api.yaml`) or the full remote URL (e.g., `https://petstore3.swagger.io/api/v3/openapi.json`).
3.  **(Optional)** Adjust the `--output-format` value (`yaml`, `json`, `json-minified`). Defaults to `json`.

## Usage Method 2: Docker

You can instruct your MCP client to run the server using the official Docker image: `kadykov/mcp-openapi-schema-explorer`.

### Client Configuration Entry (Docker Method)

- **Using a Remote URL:**

  ```json
  {
    "mcpServers": {
      "My API Spec (Docker Remote)": {
        "command": "docker",
        "args": [
          "run",
          "--rm",
          "-i",
          "kadykov/mcp-openapi-schema-explorer:latest",
          "<remote-url-to-spec>"
        ],
        "env": {}
      }
    }
  }
  ```

- **Using a Local File:** (Requires mounting the file into the container)
  ```json
  {
    "mcpServers": {
      "My API Spec (Docker Local)": {
        "command": "docker",
        "args": [
          "run",
          "--rm",
          "-i",
          "-v",
          "/full/host/path/to/spec.yaml:/spec/api.yaml",
          "kadykov/mcp-openapi-schema-explorer:latest",
          "/spec/api.yaml",
          "--output-format",
          "yaml"
        ],
        "env": {}
      }
    }
  }
  ```
  **Important:** Replace `/full/host/path/to/spec.yaml` with the correct absolute path on your host machine. The path `/spec/api.yaml` is the corresponding path inside the container.

## Usage Method 3: Global Installation (Less Common)

You can install the package globally, although `npx` is generally preferred.

```bash
# Run this command once in your terminal
npm install -g mcp-openapi-schema-explorer
```

### Client Configuration Entry (Global Install Method)

Add the following entry to your MCP client's configuration file. This assumes the `mcp-openapi-schema-explorer` command is accessible in the client's execution environment PATH.

```json
{
  "mcpServers": {
    "My API Spec (Global)": {
      "command": "mcp-openapi-schema-explorer",
      "args": ["<path-or-url-to-spec>", "--output-format", "yaml"],
      "env": {}
    }
  }
}
```

- **`command`:** Use the globally installed command name. You might need the full path if it's not in your system's PATH environment variable accessible by the MCP client.

## Usage Method 4: Local Development/Installation

This method is useful for development or running a locally modified version of the server.

### Setup Steps (Run once in your terminal)

1.  Clone the repository: `git clone https://github.com/kadykov/mcp-openapi-schema-explorer.git`
2.  Navigate into the directory: `cd mcp-openapi-schema-explorer`
3.  Install dependencies: `npm install`
4.  Build the project: `npm run build` (or `just build`)

### Client Configuration Entry (Local Development Method)

Add the following entry to your MCP client's configuration file. This instructs the client to run the locally built server using `node`.

```json
{
  "mcpServers": {
    "My API Spec (Local Dev)": {
      "command": "node",
      "args": [
        "/full/path/to/cloned/mcp-openapi-schema-explorer/dist/src/index.js",
        "<path-or-url-to-spec>",
        "--output-format",
        "yaml"
      ],

      "env": {}
    }
  }
}
```

**Important:** Replace `/full/path/to/cloned/mcp-openapi-schema-explorer/dist/src/index.js` with the correct absolute path to the built `index.js` file in your cloned repository.

## Verification

After adding the server entry to your MCP client's configuration:

1.  The server should appear in the list of available MCP servers within your client (e.g., named "My API Spec (npx)" or whatever key you used). The server name might dynamically update based on the spec's `info.title` (e.g., "Schema Explorer for Petstore API").
2.  Test the connection by accessing a basic resource, for example (using your chosen server name):
    ```
    /mcp "My API Spec (npx)" access openapi://info
    ```

## Troubleshooting

Common issues and solutions:

1.  **Server Fails to Start:**
    - Verify the `<path-or-url-to-spec>` is correct, accessible, and properly quoted in the JSON configuration.
    - Ensure the specification file is a valid OpenAPI v3.0 or Swagger v2.0 document (JSON or YAML).
    - Check Node.js version (LTS recommended) if using `npx`, global, or local install.
    - Check Docker installation and permissions if using Docker.
    - For remote URLs, check network connectivity.
    - For Docker with local files, ensure the volume mount path (`-v` flag) is correct and the host path exists.
    - For Local Development, ensure the path to `dist/src/index.js` is correct and the project has been built (`npm run build`).
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

This guide provides instructions for adding the server to your MCP client using various execution methods. Refer to the main project README for comprehensive documentation on features and resource usage.
