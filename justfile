default:
    @just --list

# Install dependencies
install:
    npm install

# Run tests
test *ARGS='':
    npm run test {{ARGS}}
    @echo "All tests passed successfully!"

# Run tests with coverage
test-coverage *ARGS='':
    npm run test:coverage {{ARGS}}

# Lint code
lint:
    npm run lint
    @echo "Linting completed successfully!"

# Format code
format:
    npm run format

# Type check
type-check:
    npm run type-check
    @echo "Type checking completed successfully!"

# Security scan dependencies for vulnerabilities
audit:
    npm audit --audit-level=high --omit=dev

# Check license compliance
check-licenses:
    npx license-checker --production \
        --onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;Python-2.0" \
        --excludePrivatePackages \
        --summary

# Run all security checks
security:
    @just audit
    @just check-licenses

# Build the project
build:
    npm run build

# Launch MCP inspector server
inspect FILE='test/fixtures/complex-endpoint.json':
    #!/usr/bin/env sh
    just build
    npx @modelcontextprotocol/inspector \
        node dist/src/index.js \
        {{FILE}} \
        --output-format yaml

# Run all checks including security
all:
    @just format
    @just lint
    @just build
    @just test-coverage
    @just security
