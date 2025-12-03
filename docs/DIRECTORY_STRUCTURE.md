# Tyaprover Directory Structure

This document provides a comprehensive overview of the file and directory structure of the Tyaprover project.

## Root Directory

- `mcp-server/`: Contains the Model Context Protocol (MCP) server implementation for AI integration. This allows Claude to control Tyaprover.
- `src/`: The main source code for the Tyaprover application (backend), written in TypeScript.
- `docs/`: Documentation files, including user journeys and deployment guides.
- `dockerfiles/`: Base Dockerfiles for various language stacks supported by Tyaprover.
- `backup-scripts/`: Scripts for backing up and restoring Tyaprover data.
- `dev-scripts/`: Scripts used for development, building, and testing.
- `init-scripts/`: Scripts used during initialization.
- `captain-sample-apps/`: Sample applications for testing.
- `template/`: Templates used by the application (e.g., Nginx configs).
- `public/`: Public static assets (likely for the web interface).
- `tests/`: Tests for the main application.

## Key Files

- `README.md`: The main entry point for documentation.
- `deploy-tyaprover.sh`: The main deployment script for production environments.
- `docker-compose.yml`: Docker Compose file for local development.
- `package.json`: NPM package configuration for the main application.
- `tsconfig.json`: TypeScript configuration for the main application.
- `mcp-config-tyaprover.json`: Configuration for the MCP server when using with Claude CLI.

## `src/` (Main Application)

The `src` directory contains the core logic of the Tyaprover backend.

- `api/`: API response wrappers and definitions (e.g., `BaseApi.ts`).
- `datastore/`: Logic for persisting data to the disk/database.
- `docker/`: Docker interaction logic, wrapping Dockerode.
- `injection/`: Dependency injection utilities.
- `models/`: Data models and interfaces defined in TypeScript.
- `routes/`: Express routes for the API.
  - `api/`: Internal API routes.
  - `user/`: User-facing routes, including the `claude` integration routes.
- `scripts/`: Utility scripts (e.g., `disable-otp.ts`).
- `user/`: Core business logic and managers.
  - `events/`: Event handling.
  - `pro/`: Pro features (if any).
  - `system/`: System-level management.
  - `ServiceManager.ts`: Manages Docker services.
  - `ImageMaker.ts`: Handles image building.
  - `UserManager.ts`: Manages user accounts and authentication.
- `utils/`: General utilities (Logger, Env, Utils).
- `app.ts`: Application entry point and Express app configuration.
- `server.ts`: Server startup script (listens on port).

## `mcp-server/` (AI Integration)

The `mcp-server` directory contains the MCP server that interfaces with Claude.

- `src/`: TypeScript source code for the MCP server.
  - `index.ts`: Main entry point, tool definitions, and API calls to the Tyaprover backend.
  - `index.test.ts`: Tests for the MCP server.
- `build/`: Compiled JavaScript output (generated after build).
- `package.json`: MCP server dependencies and scripts.
- `README.md`: Documentation specific to the MCP server.

## `dockerfiles/`

Contains base Dockerfiles for different application types supported by Tyaprover's "Captain Definition" files:
- `node`
- `php`
- `python-django`
- `ruby-rack`

## `dev-scripts/`

Contains various utility scripts for developers:
- `build_and_push_*.sh`: Scripts to build and push Docker images.
- `dev-reset-service.sh`: Script to reset services during development.
- `backup-vols.sh`: Helper to backup volumes.
