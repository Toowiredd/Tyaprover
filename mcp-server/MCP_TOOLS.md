# Tyaprover MCP Tools Reference

Complete reference for all 36 MCP tools providing comprehensive control over Tyaprover (CapRover).

**Last Updated**: 2025-12-04
**Total Tools**: 36
**API Coverage**: ~55% (36/69 endpoints)

## Quick Stats

- **Original Tools** (Pre-merge): 17
- **New Tools Added**: 19
  - Tier 1 (Critical System): 7
  - Tier 2 (High-Priority): 12
- **Coverage Improvement**: 27% → 55%

---

## Tool Categories

### 1. System Management (8 tools)

#### `getSystemStatus`
**Description**: Retrieves system status, version information, and load balancer info.
**Parameters**: None
**Returns**: System info, version, load balancer data
**API Endpoint**: `GET /api/v2/user/system/info/`, `/system/versionInfo/`, `/system/loadbalancerinfo/`
**Example**:
```typescript
// No parameters needed
const status = await callTool("getSystemStatus");
```

#### `listNodes`
**Description**: Lists the nodes in the Docker Swarm cluster.
**Parameters**: None
**Returns**: Array of Docker Swarm nodes
**API Endpoint**: `GET /api/v2/user/system/nodes/`

#### `addDockerNode`
**Description**: Adds a new Docker Swarm node to the cluster.
**Parameters**:
- `nodeType`: "manager" | "worker"
- `privateKey`: SSH private key for authentication
- `remoteNodeIpAddress`: IP address of the remote node
- `sshPort?`: SSH port (default: 22)
- `sshUser?`: SSH username (default: "root")
**API Endpoint**: `POST /api/v2/user/system/nodes/addnode/`

#### `createBackup`
**Description**: Creates a full system backup of CapRover configuration and data.
**Parameters**: None
**Returns**: Backup download token
**API Endpoint**: `POST /api/v2/user/system/createbackup/`
**Warning**: Ensure you have adequate disk space before creating backups.

#### `getRootDomain`
**Description**: Retrieves the root domain configuration for CapRover.
**Parameters**: None
**Returns**: Root domain string
**API Endpoint**: `GET /api/v2/user/system/info/`

#### `updateRootDomain`
**Description**: Updates the root domain for CapRover.
**Parameters**:
- `rootDomain`: New root domain (e.g., "example.com")
**API Endpoint**: `POST /api/v2/user/system/changerootdomain/`
**⚠️ WARNING**: This can break your setup if misconfigured! CapRover may restart.

#### `getNetDataInfo`
**Description**: Retrieves NetData monitoring information and configuration.
**Parameters**: None
**Returns**: NetData configuration and stats
**API Endpoint**: `GET /api/v2/user/system/netdata/`

#### `cleanupUnusedImages`
**Description**: Cleans up unused Docker images to free disk space.
**Parameters**:
- `mostRecentLimit?`: Keep this many most recent images per app (default: 2)
**Returns**: Cleanup status message
**API Endpoint**: `POST /api/v2/user/system/cleanup/images/`

---

### 2. Security & SSL (4 tools)

#### `enableRootSSL`
**Description**: Enables SSL for the root CapRover domain (captain.domain.com).
**Parameters**:
- `emailAddress`: Email for Let's Encrypt registration
**Returns**: Success/failure message
**API Endpoint**: `POST /api/v2/user/system/enablessl/`
**Example**:
```typescript
await callTool("enableRootSSL", { emailAddress: "admin@example.com" });
```

#### `forceSSL`
**Description**: Forces SSL (HTTPS) for a specific application.
**Parameters**:
- `appName`: The name of the application
- `isEnabled`: Whether to force HTTPS (boolean)
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/{appName}`

#### `changePassword`
**Description**: Changes the CapRover admin password.
**Parameters**:
- `oldPassword`: Current password
- `newPassword`: New password (min 8 characters)
**API Endpoint**: `POST /api/v2/user/user/changepassword/`
**Security**: Always use strong passwords with mixed characters.

#### `enableAppSsl`
**Description**: Enables SSL (HTTPS) for an application by attaching a custom domain.
**Parameters**:
- `appName`: The name of the application
- `customDomain`: The custom domain to associate
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/{appName}/customdomain`

---

### 3. Application Management (16 tools)

#### `listApps`
**Description**: Lists all applications currently deployed on the Tyaprover server.
**Parameters**: None
**Returns**: Array of app definitions
**API Endpoint**: `GET /api/v2/user/apps`

#### `registerApp`
**Description**: Explicitly registers a new application (without deploying).
**Parameters**:
- `appName`: The name of the application
- `hasPersistentData?`: Whether app has persistent data (default: false)
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/register`

#### `getAppDetails`
**Description**: Retrieves detailed configuration and status for a specific application.
**Parameters**:
- `appName`: The name of the application to inspect
**Returns**: Complete app definition
**API Endpoint**: `GET /api/v2/user/apps`

#### `deployApp`
**Description**: Deploys a new application or updates an existing one using a Docker image.
**Parameters**:
- `appName`: The name of the application (must be unique)
- `imageName`: The Docker image to deploy (e.g., 'nginx:latest', 'node:18-alpine')
- `hasPersistentData?`: Whether the app requires persistent storage (default: false)
- `ports?`: List of container ports to expose (e.g., [80, 443])
- `volumes?`: List of volume mappings (persistent storage)
- `environmentVariables?`: Environment variables to set
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/{appName}`
**Example**:
```typescript
await callTool("deployApp", {
  appName: "myapp",
  imageName: "nginx:latest",
  ports: [80],
  environmentVariables: [
    { key: "NODE_ENV", value: "production" }
  ]
});
```

#### `deleteApp`
**Description**: Permanently deletes an application and its data.
**Parameters**:
- `appName`: The name of the application to delete
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/delete`
**⚠️ WARNING**: This action is irreversible!

#### `renameApp`
**Description**: Renames an existing application.
**Parameters**:
- `oldAppName`: Current application name
- `newAppName`: New application name
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/rename`

#### `setAppEnvironmentVariables`
**Description**: Sets environment variables for an application.
**Parameters**:
- `appName`: The name of the application
- `environmentVariables`: List of key-value pairs for environment variables
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/{appName}`
**⚠️ NOTE**: This REPLACES all existing variables!

#### `scaleApp`
**Description**: Changes the number of running instances for an application.
**Parameters**:
- `appName`: The name of the application
- `instanceCount`: The desired number of instances (0 to stop)
**API Endpoint**: `POST /api/v2/user/apps/appdefinitions/{appName}`

#### `restartApp`
**Description**: Restarts an application (stops and starts).
**Parameters**:
- `appName`: The name of the application to restart
**Implementation**: Scales to 0, waits 2s, scales back to original count

#### `getAppLogs`
**Description**: Retrieves the most recent logs for a specific application.
**Parameters**:
- `appName`: The name of the application
- `lineCount?`: Number of lines to retrieve (default: 100)
**Returns**: Log lines as text
**API Endpoint**: `GET /api/v2/user/apps/appData/{appName}?logs=true&lines=N`

#### `getAppBuildLogs`
**Description**: Retrieves build logs for an application.
**Parameters**:
- `appName`: The name of the application
**Returns**: Build log lines
**API Endpoint**: `GET /api/v2/user/apps/appData/{appName}?buildLogs=true`

#### `diagnoseApp`
**Description**: Analyzes app logs for errors, warnings, and performance issues.
**Parameters**:
- `appName`: The name of the application
**Returns**: Diagnostic report with error counts, warnings, and recommendations

#### `removeCustomDomain`
**Description**: Removes a custom domain from an application.
**Parameters**:
- `appName`: The name of the application
- `customDomain`: The custom domain to remove
**API Endpoint**: `DELETE /api/v2/user/apps/appdefinitions/{appName}/customdomain`

#### `enableAppWebhookBuild`
**Description**: Enables webhook build trigger for an application (for CI/CD integration).
**Parameters**:
- `appName`: The name of the application
- `tokenVersion?`: Token version for webhook (generated if not provided)
**Returns**: Webhook token
**API Endpoint**: `POST /api/v2/user/apps/webhooks/triggerbuild`

#### `deployDatabase`
**Description**: Deploys a database (Postgres, MySQL, MongoDB, Redis) with secure defaults.
**Parameters**:
- `appName`: Name of the database application
- `dbType`: "postgres" | "mysql" | "mongodb" | "redis"
- `password?`: Password (generated if not provided)
**Returns**: Deployment status and connection info

#### `configureGitRepo`
**Description**: Configures GitOps integration for an application.
**Parameters**:
- `appName`: The name of the application
- `repo`: Git repository URL
- `branch?`: Branch to deploy from (default: "main")
- `username?`: Git username (for private repos)
- `password?`: Git password/token (for private repos)
**Returns**: GitOps configuration status

---

### 4. Docker Registry Management (5 tools)

#### `listRegistries`
**Description**: Lists configured Docker registries.
**Parameters**: None
**Returns**: Array of registry configurations
**API Endpoint**: `GET /api/v2/user/registries/`

#### `addRegistry`
**Description**: Adds a new Docker registry.
**Parameters**:
- `registryUser`: Username for the registry
- `registryPassword`: Password/Token for the registry
- `registryDomain`: Domain of the registry (e.g. registry.hub.docker.com or ghcr.io)
- `registryImagePrefix?`: Image prefix (optional, mostly for display/grouping)
**API Endpoint**: `POST /api/v2/user/registries/insert/`
**Example**:
```typescript
await callTool("addRegistry", {
  registryUser: "username",
  registryPassword: "ghp_token123",
  registryDomain: "ghcr.io",
  registryImagePrefix: "myorg"
});
```

#### `updateRegistry`
**Description**: Updates an existing Docker registry configuration.
**Parameters**:
- `registryId`: ID of the registry to update
- `registryUser?`: Username for the registry
- `registryPassword?`: Password/Token for the registry
- `registryDomain?`: Domain of the registry
- `registryImagePrefix?`: Image prefix
**API Endpoint**: `POST /api/v2/user/registries/update/`

#### `deleteRegistry`
**Description**: Deletes a Docker registry configuration.
**Parameters**:
- `registryId`: ID of the registry to delete
**API Endpoint**: `POST /api/v2/user/registries/delete/`

#### `setDefaultPushRegistry`
**Description**: Sets the default registry for pushing Docker images.
**Parameters**:
- `registryId`: ID of the registry to set as default
**API Endpoint**: `POST /api/v2/user/registries/setdefaultpushregistry/`

---

### 5. One-Click Apps (1 tool)

#### `listOneClickApps`
**Description**: Lists available One-Click Apps from the repository.
**Parameters**: None
**Returns**: Array of One-Click App templates (name, displayName, description)
**API Endpoint**: `GET /api/v2/user/oneclick/template/list`
**Note**: Returns simplified list to save tokens (full descriptions truncated)

---

## Tool Implementation Statistics

### Coverage by Category

| Category | Implemented | Available | Coverage |
|----------|-------------|-----------|----------|
| System Management | 8 | 15 | 53% |
| Security & SSL | 4 | 4 | 100% |
| Application Management | 16 | 20 | 80% |
| Docker Registry | 5 | 5 | 100% |
| One-Click Apps | 1 | 3 | 33% |
| User Management | 1 | 2 | 50% |
| Monitoring | 1 | 4 | 25% |
| Projects | 0 | 4 | 0% |
| Pro Features | 0 | 6 | 0% |
| Theme | 0 | 4 | 0% |
| **TOTAL** | **36** | **69** | **52%** |

### Missing High-Priority Tools (Future Implementation)

**Tier 3 - Medium Priority (13 tools)**:
- `enableNetData`, `disableNetData`
- `getNginxConfig`, `setNginxConfig`
- `getDiskCleanup`, `cleanupDisk`
- `getOneClickAppInfo`, `deployOneClickApp`
- `updateCaptainVersion`
- `setTheme`, `getTheme`, `deleteTheme`, `getAvailableThemes`

**Tier 4 - Advanced (20 tools)**:
- Project management (4 tools)
- Pro features & 2FA (6 tools)
- Additional monitoring tools

---

## Usage Examples

### Basic App Deployment Workflow

```typescript
// 1. Register app
await callTool("registerApp", {
  appName: "myapp",
  hasPersistentData: true
});

// 2. Deploy app
await callTool("deployApp", {
  appName: "myapp",
  imageName: "node:18-alpine",
  ports: [3000],
  environmentVariables: [
    { key: "NODE_ENV", value: "production" },
    { key: "PORT", value: "3000" }
  ]
});

// 3. Enable SSL
await callTool("enableAppSsl", {
  appName: "myapp",
  customDomain: "app.example.com"
});

// 4. Force HTTPS
await callTool("forceSSL", {
  appName: "myapp",
  isEnabled: true
});

// 5. Scale app
await callTool("scaleApp", {
  appName: "myapp",
  instanceCount: 3
});
```

### System Maintenance Workflow

```typescript
// 1. Create backup
await callTool("createBackup");

// 2. Clean up unused images
await callTool("cleanupUnusedImages", { mostRecentLimit: 2 });

// 3. Check system status
const status = await callTool("getSystemStatus");

// 4. Monitor specific app
const logs = await callTool("getAppLogs", {
  appName: "myapp",
  lineCount: 50
});

// 5. Diagnose issues
const diagnosis = await callTool("diagnoseApp", { appName: "myapp" });
```

---

## Security Considerations

1. **Password Management**
   - Use `changePassword` regularly
   - Never hardcode passwords in environment variables
   - Use secret management for sensitive data

2. **SSL/TLS**
   - Always enable root SSL with `enableRootSSL`
   - Force SSL for production apps with `forceSSL`
   - Verify Let's Encrypt email is valid

3. **Docker Registry**
   - Use registry tokens, not passwords
   - Regularly rotate registry credentials
   - Delete unused registries with `deleteRegistry`

4. **Backups**
   - Create backups before major changes
   - Store backups securely off-server
   - Test restore procedures regularly

5. **Access Control**
   - Limit MCP tool access to trusted users
   - Log all administrative actions
   - Review audit logs regularly

---

## Error Handling

All tools return consistent error formats:

```typescript
{
  content: [{
    type: "text",
    text: "Error: [specific error message]"
  }]
}
```

Common error patterns:
- `App not found` - Application doesn't exist
- `Unexpected API response structure` - API format changed
- `Failed to [action]` - Operation failed at CapRover level
- `Invalid app name` - Name validation failed

---

## Contributing

To add new tools:

1. Map the CapRover API endpoint in source code
2. Implement the tool in `mcp-server/src/index.ts`
3. Add Zod schema for parameter validation
4. Add test case in `mcp-server/src/index.test.ts`
5. Document the tool in this file

**Template**:
```typescript
server.tool(
    "toolName",
    "Description of what this tool does",
    {
        param1: z.string().describe("Parameter description"),
        param2: z.number().optional().describe("Optional parameter"),
    },
    async ({ param1, param2 }) => {
        try {
            const response = await callTyaproverApi('METHOD', '/endpoint', payload);

            if (response?.status === 100) {
                return { content: [{ type: "text", text: "Success message" }] };
            }
            return { content: [{ type: "text", text: `Error: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
```

---

**Version**: 2.0.0
**Coverage**: 52% (36/69 endpoints)
**Next Milestone**: 75% coverage (add Tier 3 tools)
