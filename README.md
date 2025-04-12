# MCP OpenAPI Schema Explorer

[![npm version](https://badge.fury.io/js/mcp-openapi-schema-explorer.svg)](https://badge.fury.io/js/mcp-openapi-schema-explorer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/kadykov/mcp-openapi-schema-explorer/graph/badge.svg?token=LFDOMJ6W4W)](https://codecov.io/gh/kadykov/mcp-openapi-schema-explorer)

An MCP (Model Context Protocol) server that provides token-efficient access to OpenAPI (v3.0) and Swagger (v2.0) specifications via **MCP Resources**.

## Project Goal

The primary goal of this project is to allow MCP clients (like Cline or Claude Desktop) to explore the structure and details of large OpenAPI specifications without needing to load the entire file into an LLM's context window. It achieves this by exposing parts of the specification through MCP Resources, which are well-suited for read-only data exploration.

This server supports loading specifications from both local file paths and remote HTTP/HTTPS URLs. Swagger v2.0 specifications are automatically converted to OpenAPI v3.0 upon loading.

## Why MCP Resources?

The Model Context Protocol defines both **Resources** and **Tools**.

- **Resources:** Represent data sources (like files, API responses). They are ideal for read-only access and exploration by MCP clients (e.g., browsing API paths in Claude Desktop).
- **Tools:** Represent executable actions or functions, often used by LLMs to perform tasks or interact with external systems.

While other MCP servers exist that provide access to OpenAPI specs via _Tools_, this project specifically focuses on providing access via _Resources_. This makes it particularly useful for direct exploration within MCP client applications.

For more details on MCP clients and their capabilities, see the [MCP Client Documentation](https://modelcontextprotocol.io/clients).

## Usage with MCP Clients (Recommended)

This server is designed to be run by MCP clients. The recommended way to configure it is using `npx`, which downloads and runs the package without requiring a global installation.

**Example Configuration (Claude Desktop - `claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "My API Spec": {
      // Choose a descriptive name for this server instance
      "command": "npx",
      "args": [
        "-y", // Auto-confirm npx installation if needed the first time
        "mcp-openapi-schema-explorer",
        "/path/to/your/local/openapi.json" // Or "https://remote/url/spec.json"
        // Optional: Specify output format for detail views (defaults to 'json')
        // "--output-format", "yaml" // Other options: "json", "json-minified"
      ],
      "env": {} // No environment variables needed currently
    }
  }
}
```

**Notes:**

- Replace `/path/to/your/local/openapi.json` with the actual **absolute path** to your local spec file or the full URL to a remote spec.
- The server name (`"My API Spec"` in the example) is how you'll identify this specific server instance within your MCP client.
- This server handles one specification per instance. To explore multiple specifications simultaneously, configure multiple entries under `mcpServers` in your client's configuration file, each pointing to a different spec file or URL.

## Alternative: Global Installation

If you prefer, you can install the server globally:

```bash
npm install -g mcp-openapi-schema-explorer
```

If installed globally, your MCP client configuration would change:

- `command`: Likely `mcp-openapi-schema-explorer` (or the full path if needed).
- `args`: Would only contain the `<path-or-url-to-spec>` and optional `--output-format` flag (omit `npx` and `-y`).

## Features

- **MCP Resource Access:** Explore OpenAPI specs via intuitive URIs (`openapi://info`, `openapi://paths/...`, `openapi://components/...`).
- **OpenAPI v3.0 & Swagger v2.0 Support:** Loads both formats, automatically converting v2.0 to v3.0.
- **Local & Remote Files:** Load specs from local file paths or HTTP/HTTPS URLs.
- **Token-Efficient:** Designed to minimize token usage for LLMs by providing structured access.
- **Multiple Output Formats:** Get detailed views in JSON (default), YAML, or minified JSON (`--output-format`).
- **Dynamic Server Name:** Server name in MCP clients reflects the `info.title` from the loaded spec.
- **Reference Transformation:** Internal `$ref`s (`#/components/...`) are transformed into clickable MCP URIs.

## Available MCP Resources

This server exposes the following MCP resource templates for exploring the OpenAPI specification:

- **`openapi://{field}`**

  - **Description:** Accesses top-level fields of the OpenAPI document (`info`, `servers`, `tags`, etc.) or lists the contents of `paths` or `components`.
  - **Parameter:** `{field}` - The name of the top-level field (e.g., `info`, `paths`, `components`).
  - **Output:** `text/plain` list for `paths` and `components`; configured format (JSON/YAML/minified JSON) for other fields.

- **`openapi://paths/{path}`**

  - **Description:** Lists the available HTTP methods (operations) for a specific API path.
  - **Parameter:** `{path}` - The API path string. **Must be URL-encoded** (e.g., `/users/{id}` becomes `users%2F%7Bid%7D`).
  - **Output:** `text/plain` list of methods.

- **`openapi://paths/{path}/{method*}`**

  - **Description:** Gets the detailed specification for one or more operations (HTTP methods) on a specific API path.
  - **Parameters:**
    - `{path}` - The API path string. **Must be URL-encoded**.
    - `{method*}` - One or more HTTP methods (e.g., `GET`, `POST`). Can be a single method or multiple separated by a comma (e.g., `GET,POST`).
  - **Output:** Configured format (JSON/YAML/minified JSON).

- **`openapi://components/{type}`**

  - **Description:** Lists the names of all defined components of a specific type.
  - **Parameter:** `{type}` - The component type (e.g., `schemas`, `responses`, `parameters`, `examples`, `requestBodies`, `headers`, `securitySchemes`, `links`, `callbacks`).
  - **Output:** `text/plain` list of component names.

- **`openapi://components/{type}/{name*}`**
  - **Description:** Gets the detailed specification for one or more named components of a specific type.
  - **Parameters:**
    - `{type}` - The component type.
    - `{name*}` - One or more component names. Can be a single name or multiple separated by a comma (e.g., `SchemaA,SchemaB`).
  - **Output:** Configured format (JSON/YAML/minified JSON).

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on setting up the development environment, running tests, and submitting changes.

## Releases

This project uses [`semantic-release`](https://github.com/semantic-release/semantic-release) for automated version management and package publishing based on [Conventional Commits](https://www.conventionalcommits.org/).

## Future Plans

- Docker container support for easier deployment.
