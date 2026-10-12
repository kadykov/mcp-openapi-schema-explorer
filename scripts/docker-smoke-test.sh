#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${1:-mcp-openapi-schema-explorer:smoke}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
FIXTURE_PATH="${FIXTURE_PATH:-${REPO_ROOT}/test/fixtures/sample-api.json}"
FIXTURE_PATH="$(realpath "${FIXTURE_PATH}")"

if [[ ! -f "${FIXTURE_PATH}" ]]; then
  echo "Fixture file not found: ${FIXTURE_PATH}" >&2
  exit 1
fi

# Build the image exactly as it will be published.
docker build -t "${IMAGE_TAG}" .

# Verify the container starts and responds to a minimal MCP initialize request.
# The server reads the OpenAPI document from a mounted file instead of depending on
# a public external API.
{
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"docker-smoke","version":"1.0.0"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
} | docker run --rm -i -v "${FIXTURE_PATH}:/spec/api.json:ro" "${IMAGE_TAG}" "/spec/api.json" \
  | python -c '
import json, sys
messages = []
for line in sys.stdin:
    try:
        messages.append(json.loads(line))
    except json.JSONDecodeError:
        continue
assert any(
  msg.get("jsonrpc") == "2.0"
  and msg.get("id") == 1
  and "result" in msg
  and isinstance(msg.get("result"), dict)
  and "serverInfo" in msg["result"]
  for msg in messages
), messages
print("docker smoke test passed")
'
