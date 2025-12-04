# Tyaprover MCP Tools - Modular Architecture

**Last Updated**: 2025-12-04
**Total Tools**: 59
**API Coverage**: ~86% (59/69 endpoints)

## Overview

This directory contains all 59 MCP tools for Tyaprover (CapRover) control, organized in a **modular, one-file-per-tool** architecture for maximum maintainability and scalability.

## Architecture Benefits

### Why Individual Files?

1. **Easy to Find**: Each tool has its own file - no searching through 1,600+ line files
2. **Easy to Modify**: Change one tool without touching others
3. **Easy to Test**: Test tools in isolation
4. **Easy to Add**: Drop in a new file to add a tool
5. **Easy to Remove**: Delete a file to remove a tool
6. **Git Friendly**: Smaller diffs, easier code reviews, better git blame
7. **Parallel Development**: Multiple developers can work on different tools simultaneously

### Before vs After

**Before (Monolithic)**:
```
src/
├─ index.ts (1,641 lines - ALL tools in one file)
└─ index.test.ts (110 lines)
```

**After (Modular)**:
```
src/
├─ index.ts (115 lines - just config + loader)
├─ index.test.ts (119 lines)
└─ tools/
    ├─ types.ts (shared types)
    ├─ registry.ts (auto-discovery loader)
    ├─ system/ (15 tool files)
    ├─ security/ (7 tool files)
    ├─ apps/ (17 tool files)
    ├─ registry/ (5 tool files)
    ├─ oneclick/ (3 tool files)
    ├─ themes/ (4 tool files)
    ├─ projects/ (4 tool files)
    └─ pro/ (2 tool files)
```

## Directory Structure

```
tools/
├─ types.ts                          # Shared TypeScript types
├─ registry.ts                       # Auto-discovery tool loader
│
├─ system/                           # System Management (15 tools)
│   ├─ getSystemStatus.ts
│   ├─ listNodes.ts
│   ├─ addDockerNode.ts
│   ├─ createBackup.ts
│   ├─ getRootDomain.ts
│   ├─ updateRootDomain.ts
│   ├─ getNetDataInfo.ts
│   ├─ cleanupUnusedImages.ts
│   ├─ enableNetData.ts
│   ├─ disableNetData.ts
│   ├─ getNginxConfig.ts
│   ├─ setNginxConfig.ts
│   ├─ getDiskCleanup.ts
│   ├─ cleanupDisk.ts
│   └─ updateCaptainVersion.ts
│
├─ security/                         # Security & SSL (7 tools)
│   ├─ enableRootSSL.ts
│   ├─ forceSSL.ts
│   ├─ changePassword.ts
│   ├─ get2FAStatus.ts
│   ├─ enable2FA.ts
│   ├─ disable2FA.ts
│   └─ verify2FA.ts
│
├─ apps/                             # Application Management (17 tools)
│   ├─ listApps.ts
│   ├─ registerApp.ts
│   ├─ getAppDetails.ts
│   ├─ deployApp.ts
│   ├─ deleteApp.ts
│   ├─ renameApp.ts
│   ├─ setAppEnvironmentVariables.ts
│   ├─ scaleApp.ts
│   ├─ restartApp.ts
│   ├─ getAppLogs.ts
│   ├─ getAppBuildLogs.ts
│   ├─ diagnoseApp.ts
│   ├─ enableAppSsl.ts
│   ├─ removeCustomDomain.ts
│   ├─ enableAppWebhookBuild.ts
│   ├─ deployDatabase.ts
│   └─ configureGitRepo.ts
│
├─ registry/                         # Docker Registry (5 tools)
│   ├─ listRegistries.ts
│   ├─ addRegistry.ts
│   ├─ updateRegistry.ts
│   ├─ deleteRegistry.ts
│   └─ setDefaultPushRegistry.ts
│
├─ oneclick/                         # One-Click Apps (3 tools)
│   ├─ listOneClickApps.ts
│   ├─ getOneClickAppInfo.ts
│   └─ deployOneClickApp.ts
│
├─ themes/                           # Theme Management (4 tools)
│   ├─ setTheme.ts
│   ├─ getTheme.ts
│   ├─ deleteTheme.ts
│   └─ getAvailableThemes.ts
│
├─ projects/                         # Project Management (4 tools)
│   ├─ listProjects.ts
│   ├─ createProject.ts
│   ├─ updateProject.ts
│   └─ deleteProject.ts
│
└─ pro/                              # Pro Features (2 tools)
    ├─ enablePro.ts
    └─ disablePro.ts
```

## How It Works

### 1. Tool File Structure

Each tool file exports a `register` function:

```typescript
import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "toolName",
        "Tool description",
        {
            // Zod schema for parameters
            param1: z.string().describe("Parameter description"),
        },
        async ({ param1 }) => {
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
};
```

### 2. Auto-Discovery Registry

The `registry.ts` module automatically discovers and loads all tool files:

```typescript
// Scans tools/ directory recursively
// Imports every .ts/.js file (except types.ts, registry.ts)
// Calls the register() function from each module
// No manual import statements needed!
```

**Benefits**:
- Add a new tool → Just drop in a file
- Remove a tool → Just delete a file
- No need to update index.ts or imports

### 3. Main Index File

The `index.ts` is now minimal (115 lines):

```typescript
import { registerAllTools } from "./tools/registry.js";

export async function main() {
    // Automatically discovers and registers all 59 tools
    await registerAllTools(server, callTyaproverApi, validateAndSanitizeAppName);

    const transport = new StdioServerTransport();
    await server.connect(transport);
}
```

## Adding a New Tool

### Step 1: Create Tool File

```bash
# Example: Adding a new "getAppMetrics" tool
cd src/tools/apps/
touch getAppMetrics.ts
```

### Step 2: Implement Tool

```typescript
import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi) => {
    server.tool(
        "getAppMetrics",
        "Retrieves performance metrics for an application.",
        {
            appName: z.string().describe("The name of the application"),
        },
        async ({ appName }) => {
            try {
                const response = await callTyaproverApi('GET', `/apps/metrics/${appName}`);

                if (response?.status === 100) {
                    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
                }
                return { content: [{ type: "text", text: `Error: ${response?.description}` }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error: ${error.message}` }] };
            }
        }
    );
};
```

### Step 3: Done!

The auto-discovery system will find and load your tool automatically. No need to modify `index.ts` or any other files.

## Removing a Tool

```bash
# Just delete the file
rm src/tools/apps/oldTool.ts
```

That's it! The tool will no longer be registered.

## Testing

### Test Individual Tool

```bash
# Test a specific tool file
npm run test -- --testNamePattern="getAppLogs"
```

### Test All Tools

```bash
# Verify all 59 tools load correctly
npm run test
```

### Manual Verification

```bash
# Build and check for errors
npm run build

# Run the server and verify tool count
npm start
# Should output: "✓ Tool Registry: 59 tools registered, 0 failed"
```

## Coverage Statistics

| Category | Tools | Coverage |
|----------|-------|----------|
| System Management | 15 | 100% |
| Security & SSL | 7 | 100% |
| Application Management | 17 | 85% |
| Docker Registry | 5 | 100% |
| One-Click Apps | 3 | 100% |
| Themes | 4 | 100% |
| Projects | 4 | 100% |
| Pro Features | 2 | 100% |
| **TOTAL** | **59** | **~86%** |

## Tool Naming Conventions

- **Verb-Noun pattern**: `getSystemStatus`, `listApps`, `deployApp`
- **PascalCase file names**: Match tool name exactly
- **Category folders**: Group related tools (system, apps, security, etc.)
- **One tool per file**: No exceptions

## Common Patterns

### Read-Only Tools (GET operations)

```typescript
export const register: ToolRegistrar = (server, callTyaproverApi) => {
    server.tool("getThing", "Gets a thing", {}, async () => {
        const response = await callTyaproverApi('GET', '/endpoint');
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
    });
};
```

### Write Tools (POST/PUT/DELETE)

```typescript
export const register: ToolRegistrar = (server, callTyaproverApi) => {
    server.tool("updateThing", "Updates a thing", {
        param: z.string().describe("Parameter")
    }, async ({ param }) => {
        const response = await callTyaproverApi('POST', '/endpoint', { param });

        if (response?.status === 100) {
            return { content: [{ type: "text", text: "Updated successfully" }] };
        }
        return { content: [{ type: "text", text: `Error: ${response?.description}` }] };
    });
};
```

### Tools with App Name Validation

```typescript
export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool("deployApp", "Deploys an app", {
        appName: z.string().describe("App name")
    }, async ({ appName }) => {
        const sanitized = validateAndSanitizeAppName!(appName);
        const response = await callTyaproverApi('POST', `/apps/${sanitized}`, payload);
        // ...
    });
};
```

## Performance

**Tool Loading Time**: ~50-100ms for 59 tools (parallel async imports)
**Memory Overhead**: Minimal - each tool file is ~1-3KB
**Build Time**: Faster - TypeScript only recompiles changed tools

## Troubleshooting

### Tool Not Loading

```bash
# Check file is in correct location
ls src/tools/category/toolName.ts

# Check exports register function
grep "export const register" src/tools/category/toolName.ts

# Check for syntax errors
npm run build
```

### Import Errors

```bash
# Ensure .js extensions in imports
# ✓ import { ToolRegistrar } from "../types.js";
# ✗ import { ToolRegistrar } from "../types";
```

### Tool Count Mismatch

```bash
# Run the server and check output
npm start
# Should show: "✓ Tool Registry: 59 tools registered, 0 failed"

# If count is wrong, check for:
# - Missing .ts files
# - Missing register() exports
# - Syntax errors preventing import
```

## Future Enhancements

### Planned Tool Categories (10 remaining)

- **monitoring/** - NetData integration, metrics, alerts (already partially implemented)
- **nginx/** - Advanced nginx configuration
- **backup/** - Backup scheduling, restoration
- **logs/** - Advanced log querying, analysis
- **webhooks/** - Webhook management
- **clusters/** - Multi-node cluster management
- **volumes/** - Volume management
- **networks/** - Network configuration
- **firewall/** - Firewall rules
- **cron/** - Scheduled tasks

### Tool Metadata

Future enhancement: Add metadata to each tool:

```typescript
export const metadata = {
    category: "apps",
    apiEndpoint: "/apps/appdefinitions",
    httpMethod: "GET",
    requiresAuth: true,
    riskLevel: "low"
};
```

## Contributing

When adding new tools, follow these guidelines:

1. **File Location**: Place in appropriate category folder
2. **Naming**: Use verb-noun pattern (e.g., `getAppStatus`, not `appStatusGetter`)
3. **Error Handling**: Always use try-catch and return proper error messages
4. **Documentation**: Add JSDoc comments for complex logic
5. **Testing**: Verify tool loads and appears in `npm start` output
6. **API Mapping**: Document which CapRover API endpoint is used

## Version History

- **v3.0.0** (2025-12-04): Modular architecture - one file per tool (59 tools)
- **v2.0.0** (2025-12-04): Added Tier 3-4 tools (36 → 59 tools)
- **v1.0.0** (2025-12-04): Initial release with Tier 1-2 tools (36 tools)

---

**Architecture**: Modular, auto-discovery, one-file-per-tool
**Maintainer**: Toowiredd
**License**: MIT
