# Contributing to MCP OpenAPI Schema Explorer

Thank you for considering contributing to this project! We welcome improvements and bug fixes.

## Getting Started

- **Devcontainer:** The easiest way to get a consistent development environment is to use the provided [Dev Container](https://code.visualstudio.com/docs/devcontainers/containers) configuration (`.devcontainer/`). If you have Docker and the VS Code Dev Containers extension installed, simply reopen the project folder in a container.
- **Manual Setup:** If you prefer not to use the devcontainer, ensure you have Node.js (v22 or later recommended) and npm installed. Clone the repository and run `npm install` to install dependencies.

## Development Workflow

This project uses [`just`](https://github.com/casey/just) as a command runner for common development tasks. See the `justfile` for all available commands. Key commands include:

- `just install`: Install dependencies (`npm install`).
- `just format`: Format code using Prettier.
- `just lint`: Check code for linting errors using ESLint.
- `just build`: Compile TypeScript code (`npx tsc`).
- `just test`: Run unit and end-to-end tests using Jest.
- `just test-coverage`: Run tests and generate a coverage report.
- `just security`: Run security checks (npm audit, license check).
- `just all`: Run format, lint, build, test-coverage, and security checks sequentially.

Please ensure `just all` passes before submitting a pull request.

## Code Style

- **Formatting:** We use [Prettier](https://prettier.io/) for automatic code formatting. Please run `just format` before committing.
- **Linting:** We use [ESLint](https://eslint.org/) for code analysis. Please run `just lint` to check for issues.

## Commit Messages

This project uses [`semantic-release`](https://github.com/semantic-release/semantic-release) to automate versioning and releases. Therefore, commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This allows the release process to automatically determine the version bump (patch, minor, major) and generate changelogs.

Common commit types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- `ci`: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- `chore`: Other changes that don't modify src or test files

Example: `feat: add support for YAML output format`
Example: `fix: correct handling of remote URL loading errors`
Example: `docs: update README with client configuration examples`

## Cline & Memory Bank

This project utilizes [Cline](https://github.com/cline/cline) for AI-assisted development. The `memory-bank/` directory contains documentation specifically for Cline's context. Maintaining this memory bank helps ensure Cline can effectively assist with development tasks.

If you make significant changes to the project's architecture, features, or development process, please consider updating the relevant files in `memory-bank/`. You can learn more about the Cline Memory Bank [here](https://docs.cline.bot/improving-your-prompting-skills/cline-memory-bank).

## Submitting Changes

1.  Fork the repository.
2.  Create a new branch for your feature or fix (`git checkout -b feat/my-new-feature` or `git checkout -b fix/my-bug-fix`).
3.  Make your changes.
4.  Ensure all checks pass (`just all`).
5.  Commit your changes using the Conventional Commits format.
6.  Push your branch to your fork (`git push origin feat/my-new-feature`).
7.  Open a pull request against the `main` branch of the original repository.

Thank you for your contribution!
