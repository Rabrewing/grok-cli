# Grok CLI DevOps Cockpit

This directory contains the source code for the Grok CLI, a conversational AI assistant for your terminal.

## Project Overview

The project is a command-line interface (CLI) tool built with TypeScript and Node.js. It provides a conversational AI experience powered by Grok and other OpenAI-compatible models. The UI is built using Ink and React, providing a rich, interactive experience in the terminal.

The core of the application is the `GrokAgent`, which manages the conversation, tool execution, and interaction with the AI model. The agent is equipped with a variety of tools for file manipulation, shell command execution, and more. The toolset is extensible via the Model Context Protocol (MCP), allowing for integrations with other services like Linear and GitHub.

### Key Technologies

*   **Language:** TypeScript
*   **Runtime:** Node.js / Bun
*   **CLI Framework:** Commander.js
*   **UI:** Ink, React
*   **AI:** Grok, OpenAI-compatible models
*   **Extensibility:** Model Context Protocol (MCP)

## Building and Running

The project uses `bun` as the preferred package manager and runtime, but also supports `npm` and `node`.

### Prerequisites

*   Bun 1.0+ (or Node.js 18+)
*   Grok API key (or another OpenAI-compatible API key)

### Development

To run the CLI in development mode:

```bash
# Install dependencies
bun install

# Run the development server
bun run dev
```

### Building for Production

To build the project for production:

```bash
# Install dependencies
bun install

# Build the project
bun run build
```

After building, the compiled output will be in the `dist` directory. You can run the production version with:

```bash
bun run start
```

### Testing and Linting

The project includes scripts for linting and type-checking:

```bash
# Run the linter
bun run lint

# Run the type checker
bun run typecheck
```

## Development Conventions

The project follows standard TypeScript and Node.js development conventions.

*   **Code Style:** The code is formatted according to the rules in `.eslintrc.js`.
*   **Type Safety:** The project is written in TypeScript and uses `tsc` for type-checking.
*   **Modularity:** The code is organized into modules for the agent, tools, UI, and other components.
*   **Configuration:** The application uses a combination of environment variables, command-line flags, and JSON configuration files for settings.
