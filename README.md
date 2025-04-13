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
      "command": "npx",
      "args": [
        "-y",
        "mcp-openapi-schema-explorer",
        "/path/to/your/local/openapi.json",
        "--output-format",
        "yaml"
      ],
      "env": {}
    }
  }
}
```

**Configuration Details:**

- **`"My API Spec"`:** Choose a descriptive name for this server instance. This is how you'll identify it within your MCP client.
- **`command`:** Use `"npx"` to run the package directly.
- **`args`:**
  - `"-y"`: Auto-confirms the `npx` installation prompt if needed the first time.
  - `"mcp-openapi-schema-explorer"`: The name of the package to execute.
  - `"/path/to/your/local/openapi.json"`: **Required.** The absolute path to your local spec file or the full URL to a remote spec (e.g., `"https://remote/url/spec.json"`).
  - `"--output-format", "yaml"`: **Optional.** Specifies the output format for detailed resource views. Defaults to `"json"`. Other options are `"yaml"` and `"json-minified"`.
- **`env`:** Currently, no environment variables are needed for this server.

**Notes:**

- This server handles one specification per instance. To explore multiple specifications simultaneously, configure multiple entries under `mcpServers` in your client's configuration file, each pointing to a different spec file or URL and using a unique server name.

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

This server exposes the following MCP resource templates for exploring the OpenAPI specification.

**Understanding Multi-Value Parameters (`*`)**

Some resource templates include parameters ending with an asterisk (`*`), like `{method*}` or `{name*}`. This indicates that the parameter accepts **multiple comma-separated values**. For example, to request details for both the `GET` and `POST` methods of a path, you would use a URI like `openapi://paths/users/get,post`. This allows fetching details for multiple items in a single request.

**Resource Templates:**

- **`openapi://{field}`**

  - **Description:** Accesses top-level fields of the OpenAPI document (e.g., `info`, `servers`, `tags`) or lists the contents of `paths` or `components`. The specific available fields depend on the loaded specification.
  - **Example:** `openapi://info`
  - **Output:** `text/plain` list for `paths` and `components`; configured format (JSON/YAML/minified JSON) for other fields.
  - **Completions:** Provides dynamic suggestions for `{field}` based on the actual top-level keys found in the loaded spec.

- **`openapi://paths/{path}`**

  - **Description:** Lists the available HTTP methods (operations) for a specific API path.
  - **Parameter:** `{path}` - The API path string. **Must be URL-encoded** (e.g., `/users/{id}` becomes `users%2F%7Bid%7D`).
  - **Example:** `openapi://paths/users%2F%7Bid%7D`
  - **Output:** `text/plain` list of methods.
  - **Completions:** Provides dynamic suggestions for `{path}` based on the paths found in the loaded spec (URL-encoded).

- **`openapi://paths/{path}/{method*}`**

  - **Description:** Gets the detailed specification for one or more operations (HTTP methods) on a specific API path.
  - **Parameters:**
    - `{path}` - The API path string. **Must be URL-encoded**.
    - `{method*}` - One or more HTTP methods (e.g., `get`, `post`, `get,post`). Case-insensitive.
  - **Example (Single):** `openapi://paths/users%2F%7Bid%7D/get`
  - **Example (Multiple):** `openapi://paths/users%2F%7Bid%7D/get,post`
  - **Output:** Configured format (JSON/YAML/minified JSON).
  - **Completions:** Provides dynamic suggestions for `{path}`. Provides static suggestions for `{method*}` (common HTTP verbs like GET, POST, PUT, DELETE, etc.).

- **`openapi://components/{type}`**

  - **Description:** Lists the names of all defined components of a specific type (e.g., `schemas`, `responses`, `parameters`). The specific available types depend on the loaded specification. Also provides a short description for each listed type.
  - **Example:** `openapi://components/schemas`
  - **Output:** `text/plain` list of component names with descriptions.
  - **Completions:** Provides dynamic suggestions for `{type}` based on the component types found in the loaded spec.

- **`openapi://components/{type}/{name*}`**
  - **Description:** Gets the detailed specification for one or more named components of a specific type.
  - **Parameters:**
    - `{type}` - The component type.
    - `{name*}` - One or more component names (e.g., `User`, `Order`, `User,Order`). Case-sensitive.
  - **Example (Single):** `openapi://components/schemas/User`
  - **Example (Multiple):** `openapi://components/schemas/User,Order`
  - **Output:** Configured format (JSON/YAML/minified JSON).
  - **Completions:** Provides dynamic suggestions for `{type}`. Provides dynamic suggestions for `{name*}` _only if_ the loaded spec contains exactly one component type overall (e.g., only `schemas`). This limitation exists because the MCP SDK currently doesn't support providing completions scoped to the selected `{type}`; providing all names across all types could be misleading.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on setting up the development environment, running tests, and submitting changes.

## Releases

This project uses [`semantic-release`](https://github.com/semantic-release/semantic-release) for automated version management and package publishing based on [Conventional Commits](https://www.conventionalcommits.org/).

## Future Plans

- Docker container support for easier deployment.
