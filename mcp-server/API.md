# Tyaprover MCP Server API Documentation

This document describes the available tools and their usage in the Tyaprover MCP Server.

## Overview

The Tyaprover MCP Server provides AI assistants with tools to interact with your Tyaprover instance. All tools communicate with the Tyaprover REST API using authenticated requests.

## Authentication

The server requires the following environment variables:

- `TYAPROVER_API_URL`: Base URL of your Tyaprover instance (e.g., `https://captain.toowired.win`)
- `TYAPROVER_AUTH_TOKEN`: Authentication token (x-captain-auth header value)
- `TYAPROVER_NAMESPACE`: Namespace, typically `captain`

## Available Tools

### 1. tyaprover/listApps

**Description:** List all deployed applications in Tyaprover

**Usage:**
```
AI: "Show me all my applications"
AI: "List my deployed apps"
AI: "What applications are running?"
```

**Parameters:** None

**Response:** JSON array of application data including:
- App names
- Status (running, stopped, etc.)
- Resource usage
- URLs and domains
- Container information

**Example Response:**
```json
{
  "apps": [
    {
      "appName": "my-api",
      "isAppBuilding": false,
      "hasPersistentData": false,
      "notExposeAsWebApp": false,
      "deployedVersion": 1,
      "appPushWebhook": {...},
      "appDefinition": {...}
    }
  ]
}
```

### 2. tyaprover/getAppDetails

**Description:** Get detailed information for a specific application

**Usage:**
```
AI: "Show me details for my-api app"
AI: "What's the status of the user-portal application?"
AI: "Get information about my database app"
```

**Parameters:**
- `appName` (string, required): Name of the application

**Response:** Detailed application information including:
- Configuration settings
- Environment variables
- Volume mounts
- Port mappings
- Build and deployment history
- Resource limits

**Example Response:**
```json
{
  "appName": "my-api",
  "instanceCount": 1,
  "captainDefinitionRelativeFilePath": "./captain-definition",
  "networks": ["captain-overlay-network"],
  "volumes": [...],
  "ports": [...],
  "envVars": [...],
  "customDomain": [...]
}
```

### 3. tyaprover/deployApp

**Description:** Deploy a new application

**Usage:**
```
AI: "Deploy a new Node.js app called portfolio using node:18 image"
AI: "Create and deploy an application named api-server with nginx:alpine"
AI: "Deploy a Python app called data-processor using python:3.9"
```

**Parameters:**
- `appName` (string, required): Name for the new application
- `imageName` (string, required): Docker image to deploy

**Response:** Deployment confirmation message

**Example Usage:**
```javascript
// AI processes: "Deploy a new app called my-blog using nginx:alpine"
{
  "appName": "my-blog",
  "imageName": "nginx:alpine"
}
```

**Example Response:**
```json
{
  "message": "Successfully deployed my-blog with image nginx:alpine"
}
```

## Error Handling

All tools return error information when operations fail:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: API call failed: 401 Unauthorized"
    }
  ],
  "isError": true
}
```

Common error scenarios:
- **Authentication errors**: Invalid or expired auth token
- **Network errors**: Tyaprover instance unreachable
- **API errors**: Invalid parameters or server-side issues
- **Permission errors**: Insufficient privileges for requested operation

## Configuration

### Server Configuration (config.json)

```json
{
  "server": {
    "name": "tyaprover",
    "version": "0.1.0"
  },
  "api": {
    "baseUrl": "https://captain.toowired.win",
    "version": "v2",
    "timeout": 30000
  },
  "security": {
    "authHeader": "x-captain-auth"
  },
  "logging": {
    "level": "info",
    "format": "text"
  }
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TYAPROVER_API_URL` | Base URL of Tyaprover instance | `http://localhost:7474` | No |
| `TYAPROVER_AUTH_TOKEN` | Authentication token | None | Yes |
| `TYAPROVER_NAMESPACE` | API namespace | `captain` | No |
| `API_TIMEOUT` | Request timeout in milliseconds | `30000` | No |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` | No |

## Usage Examples

### Natural Language Commands

The MCP server enables natural language interaction with your Tyaprover instance:

```bash
# List applications
claude "What applications do I have deployed?"
claude "Show me my running services"

# Get app details
claude "Tell me about my API application"
claude "What's the configuration of my database app?"

# Deploy new applications
claude "Deploy a new React app called portfolio"
claude "Create a MongoDB service using the latest mongo image"
claude "Deploy nginx as a reverse proxy called gateway"
```

### Programmatic Usage

When building MCP clients or integrating with other tools:

```javascript
// List apps
await mcpClient.callTool("tyaprover/listApps", {});

// Get specific app
await mcpClient.callTool("tyaprover/getAppDetails", {
  appName: "my-api"
});

// Deploy new app
await mcpClient.callTool("tyaprover/deployApp", {
  appName: "new-service",
  imageName: "node:18-alpine"
});
```

## Security Considerations

1. **Token Security**: Store auth tokens securely, avoid committing to version control
2. **Network Security**: Use HTTPS for production Tyaprover instances
3. **Access Control**: Ensure the auth token has appropriate permissions
4. **Audit Logging**: Monitor MCP server logs for unusual activity

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check `TYAPROVER_API_URL` is correct
   - Verify Tyaprover instance is running
   - Check network connectivity

2. **Authentication Failed**
   - Verify `TYAPROVER_AUTH_TOKEN` is valid
   - Check token hasn't expired
   - Ensure token has required permissions

3. **Tool Not Found**
   - Verify MCP server is properly built (`npm run build`)
   - Check Claude CLI MCP configuration
   - Restart Claude CLI if needed

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export LOG_LEVEL=debug
```

This will show detailed API requests and responses in the logs.

## Future Enhancements

Planned features for future versions:

- **App scaling tools** - Scale applications up/down
- **Log retrieval** - Fetch application logs
- **Health monitoring** - Check application health status
- **Domain management** - Add/remove custom domains
- **SSL certificate management** - Manage Let's Encrypt certificates
- **Database tools** - Deploy and manage databases
- **Backup/restore** - Application and data backup tools

---

<!-- Generated by Copilot -->
