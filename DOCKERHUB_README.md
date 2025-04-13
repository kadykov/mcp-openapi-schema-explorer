# MCP OpenAPI Schema Explorer

[![Docker Pulls](https://img.shields.io/docker/pulls/kadykov/mcp-openapi-schema-explorer.svg)](https://hub.docker.com/r/kadykov/mcp-openapi-schema-explorer)
[![GitHub Repo](https://img.shields.io/badge/GitHub-kadykov/mcp--openapi--schema--explorer-blue?logo=github)](https://github.com/kadykov/mcp-openapi-schema-explorer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This Docker image runs the **MCP OpenAPI Schema Explorer**, an MCP (Model Context Protocol) server that provides token-efficient access to OpenAPI (v3.0) and Swagger (v2.0) specifications via **MCP Resources**.

It allows MCP clients (like Cline or Claude Desktop) to explore the structure and details of large OpenAPI specifications without needing to load the entire file into an LLM's context window.

**Source Code & Full Documentation:** [https://github.com/kadykov/mcp-openapi-schema-explorer](https://github.com/kadykov/mcp-openapi-schema-explorer)

## Features

- **MCP Resource Access:** Explore OpenAPI specs via intuitive URIs (`openapi://info`, `openapi://paths/...`, `openapi://components/...`).
- **OpenAPI v3.0 & Swagger v2.0 Support:** Loads both formats, automatically converting v2.0 to v3.0.
- **Local & Remote Files:** Load specs from local file paths (via volume mount) or HTTP/HTTPS URLs.
- **Token-Efficient:** Designed to minimize token usage for LLMs.
- **Multiple Output Formats:** Get detailed views in JSON (default), YAML, or minified JSON (`--output-format`).
- **Dynamic Server Name:** Server name in MCP clients reflects the `info.title` from the loaded spec.
- **Reference Transformation:** Internal `$ref`s (`#/components/...`) are transformed into clickable MCP URIs.

## How to Run

Pull the image:

```bash
docker pull kadykov/mcp-openapi-schema-explorer:latest
```

The container expects the path or URL to the OpenAPI specification as a command-line argument.

### Using a Remote Specification URL

Pass the URL directly to `docker run`:

```bash
docker run --rm -i kadykov/mcp-openapi-schema-explorer:latest https://petstore3.swagger.io/api/v3/openapi.json
```

### Using a Local Specification File

Mount your local file into the container using the `-v` flag and provide the path _inside the container_ as the argument:

```bash
# Example: Mount local file ./my-spec.yaml to /spec/api.yaml inside the container
docker run --rm -i -v "$(pwd)/my-spec.yaml:/spec/api.yaml" kadykov/mcp-openapi-schema-explorer:latest /spec/api.yaml
```

_(Note: Replace `$(pwd)/my-spec.yaml` with the actual absolute path to your local file on the host machine)_

### Specifying Output Format

Use the `--output-format` flag (optional, defaults to `json`):

```bash
# Using YAML output with a remote URL
docker run --rm -i kadykov/mcp-openapi-schema-explorer:latest https://petstore3.swagger.io/api/v3/openapi.json --output-format yaml

# Using minified JSON with a local file
docker run --rm -i -v "$(pwd)/my-spec.yaml:/spec/api.yaml" kadykov/mcp-openapi-schema-explorer:latest /spec/api.yaml --output-format json-minified
```

Supported formats: `json`, `yaml`, `json-minified`.

## Tags

- `latest`: Points to the most recent stable release.
- Specific version tags (e.g., `1.2.1`) are available corresponding to the npm package versions.

## Usage with MCP Clients

You can configure your MCP client (like Cline or Claude Desktop) to run this Docker image as an MCP server.

### Example: Remote URL Specification

```json
// Example: ~/.config/cline/mcp_config.json
{
  "mcpServers": {
    "My API Spec (Docker Remote)": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i", // Required for MCP communication
        "kadykov/mcp-openapi-schema-explorer:latest",
        "https://petstore3.swagger.io/api/v3/openapi.json"
        // Optional: Add "--output-format", "yaml" here if needed
      ],
      "env": {}
    }
  }
}
```

### Example: Local File Specification

```json
// Example: ~/.config/cline/mcp_config.json
{
  "mcpServers": {
    "My API Spec (Docker Local)": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i", // Required for MCP communication
        "-v",
        "/full/path/to/your/local/openapi.yaml:/spec/api.yaml", // Host path : Container path
        "kadykov/mcp-openapi-schema-explorer:latest",
        "/spec/api.yaml", // Path inside the container
        "--output-format",
        "yaml" // Optional format
      ],
      "env": {}
    }
  }
}
```

_(Remember to replace `/full/path/to/your/local/openapi.yaml` with the correct absolute path on your host machine)_

## Support

For issues or questions, please refer to the [GitHub repository](https://github.com/kadykov/mcp-openapi-schema-explorer) or open an [issue](https://github.com/kadykov/mcp-openapi-schema-explorer/issues).
