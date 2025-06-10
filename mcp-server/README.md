# Tyaprover (CapRover) MCP Server for Claude Code CLI

This document describes how to set up and use the Tyaprover Model Context Protocol (MCP) server. This server allows you to interact with and control your Tyaprover (a fork of CapRover) instance using natural language prompts via the Anthropic Claude Code CLI.

## Overview

The Tyaprover MCP server acts as a bridge between the Claude Code CLI and your Tyaprover instance. When you issue commands to the Claude CLI, it can use this MCP server to call specific "tools" that perform actions within Tyaprover, such as listing apps, deploying new applications, and managing existing ones.

The MCP server is a Node.js application that the Claude Code CLI launches as a subprocess. It communicates with your main Tyaprover application by making calls to its existing REST API.

## Prerequisites

Before you begin, ensure you have the following:

1.  **Node.js and npm:** Required to build and run the MCP server. Install from [https://nodejs.org/](https://nodejs.org/).
2.  **Running Tyaprover Instance:** Your Tyaprover (CapRover) instance must be running and accessible over the network from where you intend to run the MCP server (usually the same machine where Claude CLI launches it).
3.  **Tyaprover Auth Token:** A valid `x-captain-auth` token for your Tyaprover instance. You can obtain this by:
    *   Logging into Tyaprover in a web browser.
    *   Opening developer tools (Network tab).
    *   Finding the `x-captain-auth` header in any authenticated API request.
    *   *Note: This token might have an expiration. For long-term use, ensure you have a stable token.*
4.  **Claude Code CLI:** The `claude` CLI tool from Anthropic must be installed globally (`npm install -g @anthropic-ai/claude-code`) and authenticated with Anthropic.
5.  **Project Files:** You should have the Tyaprover (CapRover) project code, including the `mcp-server/` directory.

## Setup and Running the Tyaprover MCP Server

The MCP server is typically launched automatically by the Claude Code CLI based on your `mcp-config.json`. However, you'll need to build it first.

1.  **Navigate to the MCP Server Directory:**
    ```bash
    cd /path/to/your/caprover-project/mcp-server/
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Build the Server:**
    ```bash
    npm run build
    ```
    This command compiles the TypeScript source code into JavaScript in the `mcp-server/build/` directory and makes the `build/index.js` file executable.

4.  **Manual Testing (Optional):**
    You can test run the server manually to see if it starts, but it won't do much without being called by an MCP client (like Claude CLI).
    ```bash
    # Ensure these are set in your environment for manual testing:
    # export TYAPROVER_API_URL="https://captain.your-domain.com"
    # export TYAPROVER_AUTH_TOKEN="your-auth-token"
    # export TYAPROVER_NAMESPACE="captain"
    npm start
    ```
    You should see a message like "Tyaprover MCP Server running on stdio..." in the console error stream. Press `Ctrl+C` to stop.

## Configuring Claude Code CLI (`mcp-config.json`)

To enable the Claude Code CLI to use your Tyaprover MCP server, you need to create or update an `mcp-config.json` file. This file tells Claude CLI how to launch your server.

**Location:** You can place this file anywhere, for example, in your user's Claude configuration directory (e.g., `~/.claude/mcp-config.json` on Linux/macOS) or in your project directory. You will then specify its path when running `claude`.

**Content:**

```json
{
  "mcpServers": {
    "tyaprover": {
      "command": "node",
      "args": [
        "/absolute/path/to/your/caprover-project/mcp-server/build/index.js"
      ],
      "env": {
        "TYAPROVER_API_URL": "https://captain.your-caprover-domain.com",
        "TYAPROVER_AUTH_TOKEN": "your-long-lived-caprover-auth-token",
        "TYAPROVER_NAMESPACE": "captain",
        "CAPROVER_API_VERSION": "v2"
      }
    }
  }
}
```

**Key fields to customize:**

*   **`command`**: Should generally be `"node"`.
*   **`args[0]`**: **Crucial!** Replace `/absolute/path/to/your/caprover-project/mcp-server/build/index.js` with the correct, absolute path to the compiled `index.js` file of *your* Tyaprover MCP server.
*   **`env.TYAPROVER_API_URL`**: Your Tyaprover instance's base URL (e.g., `http://localhost:3000` or `https://captain.yourdomain.com`).
*   **`env.TYAPROVER_AUTH_TOKEN`**: Your valid `x-captain-auth` token.
*   **`env.TYAPROVER_NAMESPACE`**: Usually `"captain"`.
*   **`env.CAPROVER_API_VERSION`**: The API version your CapRover instance uses (e.g., "v2").

**Usage with Claude CLI:**

```bash
claude --mcp-config /path/to/your/mcp-config.json "Your prompt here"
```
Or, in interactive mode:
```bash
claude --mcp-config /path/to/your/mcp-config.json
> Your prompt for Tyaprover
```

## Available Tools

The Tyaprover MCP server currently exposes the following tools (this list will grow as more tools are implemented):

*   **`tyaprover/listApps`**:
    *   Description: Lists all deployed applications.
    *   Inputs: None.
    *   Output: JSON array of application definitions.
*   **`tyaprover/getAppDetails`**:
    *   Description: Gets detailed information for a specific application.
    *   Inputs: `appName` (string).
    *   Output: JSON object of the application definition.
*   **`tyaprover/deployNewApp`**:
    *   Description: Deploys a new application or updates an existing one.
    *   Inputs: `appName` (string), `imageName` (string), `instanceCount` (optional number), `environmentVariables` (optional array of key-value pairs), `portMappings` (optional array), `volumes` (optional array), etc.
    *   Output: Text confirmation.

*(More tools like `deleteApp`, `setAppEnvironmentVariables`, `scaleApp`, `enableAppSsl`, `removeCustomDomain` are planned).*

## Example Prompts

Here are some ways you might prompt Claude to use these tools:

*   `"List all my apps in Tyaprover."` (Uses `tyaprover/listApps`)
*   `"Get details for the app 'my-api' in Tyaprover."` (Uses `tyaprover/getAppDetails`)
*   `"Deploy a new Tyaprover app named 'blog' from the image 'wordpress:latest'. Give it 1 instance and expose container port 80."` (Uses `tyaprover/deployNewApp`)
*   `"Update the 'blog' app in Tyaprover to use the image 'wordpress:5.8' and set an environment variable 'WP_DEBUG' to 'true'."` (Uses `tyaprover/deployNewApp` for updates)

Claude will interpret your natural language and attempt to call the appropriate tool with the correct parameters.

## Troubleshooting

*   **"Command not found" or server doesn't start:**
    *   Ensure the `command` and `args` path in `mcp-config.json` correctly point to your executable `mcp-server/build/index.js`.
    *   Make sure `node` is installed and in your PATH.
    *   Check permissions on `mcp-server/build/index.js` (it should be executable, `npm run build` attempts to set this).
*   **Authentication Errors / API Errors:**
    *   Verify `TYAPROVER_API_URL` and `TYAPROVER_AUTH_TOKEN` in `mcp-config.json` are correct and the token is still valid.
    *   The MCP server logs errors to `console.error()`. When Claude CLI runs it, these logs might appear in Claude's own logs or terminal output, depending on Claude CLI's verbosity and error handling. Check the `mcp-server-tyaprover.log` file if using Claude Desktop.
*   **Tool Not Found / Incorrect Parameters:**
    *   Ensure your prompt is clear.
    *   Check the tool definitions in `mcp-server/src/index.ts` if you suspect an issue with how tools are defined or named.
