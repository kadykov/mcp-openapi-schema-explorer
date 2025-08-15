<p align="center">
  <img src="assets/logo-400.png" alt="MCP OpenAPI Schema Explorer Logo" width="200">
</p>

# MCP OpenAPI Schema Explorer

[![npm version](https://badge.fury.io/js/mcp-openapi-schema-explorer.svg)](https://badge.fury.io/js/mcp-openapi-schema-explorer)
[![NPM Downloads](https://img.shields.io/npm/dw/mcp-openapi-schema-explorer)](https://badge.fury.io/js/mcp-openapi-schema-explorer)
[![Docker Pulls](https://img.shields.io/docker/pulls/kadykov/mcp-openapi-schema-explorer.svg)](https://hub.docker.com/r/kadykov/mcp-openapi-schema-explorer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/kadykov/mcp-openapi-schema-explorer/graph/badge.svg?token=LFDOMJ6W4W)](https://codecov.io/gh/kadykov/mcp-openapi-schema-explorer)
[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/819a3ba3-ad54-4657-9241-648497e57d7b)
[![](https://tokei.rs/b1/github/kadykov/mcp-openapi-schema-explorer?category=code)](https://github.com/kadykov/mcp-openapi-schema-explorer)

[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/kadykov/mcp-openapi-schema-explorer)](https://archestra.ai/mcp-catalog/kadykov__mcp-openapi-schema-explorer)

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

## Installation

For the recommended usage methods (`npx` and Docker, described below), **no separate installation step is required**. Your MCP client will download the package or pull the Docker image automatically based on the configuration you provide.

However, if you prefer or need to install the server explicitly, you have two options:

1.  **Global Installation:** You can install the package globally using npm:

    ```bash
    npm install -g mcp-openapi-schema-explorer
    ```

    See **Method 3** below for how to configure your MCP client to use a globally installed server.

2.  **Local Development/Installation:** You can clone the repository and build it locally:
    ```bash
    git clone https://github.com/kadykov/mcp-openapi-schema-explorer.git
    cd mcp-openapi-schema-explorer
    npm install
    npm run build
    ```
    See **Method 4** below for how to configure your MCP client to run the server from your local build using `node`.

## Adding the Server to your MCP Client

This server is designed to be run by MCP clients (like Claude Desktop, Windsurf, Cline, etc.). To use it, you add a configuration entry to your client's settings file (often a JSON file). This entry tells the client how to execute the server process (e.g., using `npx`, `docker`, or `node`). The server itself doesn't require separate configuration beyond the command-line arguments specified in the client settings entry.

Below are the common methods for adding the server entry to your client's configuration.

### Method 1: npx (Recommended)

Using `npx` is recommended as it avoids global/local installation and ensures the client uses the latest published version.

**Example Client Configuration Entry (npx Method):**

Add the following JSON object to the `mcpServers` section of your MCP client's configuration file. This entry instructs the client on how to run the server using `npx`:

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

**Configuration Notes:**

- Replace `"My API Spec (npx)"` with a unique name for this server instance in your client.
- Replace `<path-or-url-to-spec>` with the absolute local file path or full remote URL of your specification.
- The `--output-format` is optional (`json`, `yaml`, `json-minified`), defaulting to `json`.
- To explore multiple specifications, add separate entries in `mcpServers`, each with a unique name and pointing to a different spec.

### Method 2: Docker

You can instruct your MCP client to run the server using the official Docker image: `kadykov/mcp-openapi-schema-explorer`.

**Example Client Configuration Entries (Docker Method):**

Add one of the following JSON objects to the `mcpServers` section of your MCP client's configuration file. These entries instruct the client on how to run the server using `docker run`:

- **Remote URL:** Pass the URL directly to `docker run`.

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

### Method 3: Global Installation (Less Common)

If you have installed the package globally using `npm install -g`, you can configure your client to run it directly.

```bash
# Run this command once in your terminal
npm install -g mcp-openapi-schema-explorer
```

**Example Client Configuration Entry (Global Install Method):**

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

- Ensure the `command` (`mcp-openapi-schema-explorer`) is accessible in the PATH environment variable used by your MCP client.

### Method 4: Local Development/Installation

This method is useful if you have cloned the repository locally for development or to run a modified version.

**Setup Steps (Run once in your terminal):**

1.  Clone the repository: `git clone https://github.com/kadykov/mcp-openapi-schema-explorer.git`
2.  Navigate into the directory: `cd mcp-openapi-schema-explorer`
3.  Install dependencies: `npm install`
4.  Build the project: `npm run build` (or `just build`)

**Example Client Configuration Entry (Local Development Method):**

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

(Future plans to be determined)
