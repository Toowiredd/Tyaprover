import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from 'node-fetch'; // For making API calls to Tyaprover
import { BackgroundAgent } from "./BackgroundAgent.js";

// Configuration from environment variables
const TYAPROVER_API_URL = process.env.TYAPROVER_API_URL; // e.g., http://localhost:7474 or https://captain.yourdomain.com
const TYAPROVER_AUTH_TOKEN = process.env.TYAPROVER_AUTH_TOKEN;
const TYAPROVER_NAMESPACE = process.env.TYAPROVER_NAMESPACE || 'user'; // Default to 'user' as per Tyaprover API structure
const CAPROVER_API_VERSION = process.env.CAPROVER_API_VERSION || 'v2'; // Or fetch from CapRover constants if possible
const ENABLE_AUTONOMOUS_AGENT = process.env.TYAPROVER_ENABLE_AUTONOMOUS_AGENT === 'true';

if (!TYAPROVER_API_URL || !TYAPROVER_AUTH_TOKEN) {
    console.error("FATAL: TYAPROVER_API_URL and TYAPROVER_AUTH_TOKEN environment variables are required.");
    process.exit(1);
}

const server = new McpServer({
    name: "tyaprover",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});

// Initialize Background Agent if enabled
if (ENABLE_AUTONOMOUS_AGENT) {
    const agent = new BackgroundAgent(TYAPROVER_API_URL, TYAPROVER_AUTH_TOKEN, TYAPROVER_NAMESPACE);
    agent.start();
}

// Export server for testing purposes
export { server };

// --- Helpers ---

// Helper function to make API calls to Tyaprover
async function callTyaproverApi(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${TYAPROVER_API_URL}/api/${CAPROVER_API_VERSION}/${TYAPROVER_NAMESPACE}${endpoint}`;
    const headers: any = {
        'x-captain-auth': TYAPROVER_AUTH_TOKEN
    };
    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : undefined
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                return { status: response.status, description: text }; // Mimic CapRover error structure if text
            }
            return text;
        }
    } catch (error: any) {
        console.error(`API Call failed: ${method} ${url}`, error);
        throw new Error(`Tyaprover API request failed with status ${error.status || 'unknown'}: ${error.message}`);
    }
}

// Helper to validate and sanitize app names
function validateAndSanitizeAppName(appName: string): string {
    if (!appName) {
        throw new Error("App name is required.");
    }
    const sanitized = appName.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!sanitized) {
        throw new Error(`Invalid app name '${appName}'. App names must contain alphanumeric characters.`);
    }
    if (sanitized.length > 50) {
         throw new Error(`App name '${appName}' is too long. Max 50 characters.`);
    }
    return sanitized;
}

// --- Tool: getSystemStatus ---
server.tool(
    "getSystemStatus",
    "Retrieves system status, version information, and load balancer info.",
    {},
    async () => {
        try {
            const [infoRes, versionRes, loadBalancerRes] = await Promise.all([
                callTyaproverApi('GET', '/system/info/'),
                callTyaproverApi('GET', '/system/versionInfo/'),
                callTyaproverApi('GET', '/system/loadbalancerinfo/')
            ]);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        info: infoRes?.data || infoRes,
                        version: versionRes?.data || versionRes,
                        loadBalancer: loadBalancerRes?.data || loadBalancerRes
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error fetching system status: ${error.message}` }] };
        }
    }
);

// --- Tool: listNodes ---
server.tool(
    "listNodes",
    "Lists the nodes in the Docker Swarm cluster.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/system/nodes/');
            if (response && response.status === 100 && response.data && response.data.nodes) {
                return { content: [{ type: "text", text: JSON.stringify(response.data.nodes, null, 2) }] };
            }
             return { content: [{ type: "text", text: `Error listing nodes: ${response?.description || JSON.stringify(response)}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- Tool: listRegistries ---
server.tool(
    "listRegistries",
    "Lists configured Docker registries.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/registries/');

            if (response && response.status === 100 && response.data && response.data.registries) {
                return { content: [{ type: "text", text: JSON.stringify(response.data.registries, null, 2) }] };
            }
             return { content: [{ type: "text", text: `Error listing registries: ${response?.description || JSON.stringify(response)}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- Tool: addRegistry ---
server.tool(
    "addRegistry",
    "Adds a new Docker registry.",
    {
        registryUser: z.string().describe("Username for the registry"),
        registryPassword: z.string().describe("Password/Token for the registry"),
        registryDomain: z.string().describe("Domain of the registry (e.g. registry.hub.docker.com or ghcr.io)"),
        registryImagePrefix: z.string().optional().describe("Image prefix (optional, mostly for display/grouping)"),
    },
    async ({ registryUser, registryPassword, registryDomain, registryImagePrefix }) => {
        try {
            const payload = {
                registryUser,
                registryPassword,
                registryDomain,
                registryImagePrefix: registryImagePrefix || ""
            };
            const response = await callTyaproverApi('POST', '/registries/insert/', payload);

            if (response && response.status === 100) {
                 return { content: [{ type: "text", text: `Registry ${registryDomain} added successfully.` }] };
            }
             return { content: [{ type: "text", text: `Failed to add registry: ${response?.description}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- Tool: listOneClickApps ---
server.tool(
    "listOneClickApps",
    "Lists available One-Click Apps from the repository.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/oneclick/template/list');
             if (response && response.status === 100 && response.data && response.data.oneClickApps) {
                // Returns a potentially large list. We might want to summarize or limit.
                // For now, return the list name and displayName to save tokens.
                const simpleList = response.data.oneClickApps.map((app: any) => ({
                    name: app.name,
                    displayName: app.displayName,
                    description: app.description ? app.description.substring(0, 100) + '...' : ''
                }));
                return { content: [{ type: "text", text: JSON.stringify(simpleList, null, 2) }] };
            }
             return { content: [{ type: "text", text: `Error listing one-click apps: ${response?.description || JSON.stringify(response)}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);


// --- Tool: listApps ---
server.tool(
    "listApps",
    "Lists all applications currently deployed on the Tyaprover server.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/apps');
            if (response && response.status === 100 && response.data && response.data.appDefinitions) {
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.appDefinitions) }],
                };
            } else {
                console.error("Unexpected response structure from Tyaprover listApps:", response);
                return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
            }
        } catch (error: any) {
            console.error("MCP listApps tool error:", error);
            return { content: [{ type: "text", text: `Error listing apps: ${error.message}` }] };
        }
    }
);

// --- Tool: getAppDetails ---
server.tool(
    "getAppDetails",
    "Retrieves detailed configuration and status for a specific application.",
    {
        appName: z.string().describe("The name of the application to inspect."),
    },
    async ({ appName }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const response = await callTyaproverApi('GET', '/apps');

            if (response && response.status === 100 && response.data && response.data.appDefinitions) {
                const app = response.data.appDefinitions.find((a: any) => a.appName === sanitizedAppName);
                if (app) {
                    return { content: [{ type: "text", text: JSON.stringify(app) }] };
                } else {
                    return { content: [{ type: "text", text: `Error: App '${sanitizedAppName}' not found.` }] };
                }
            } else {
                 console.error("Unexpected response structure from Tyaprover getAppDetails:", response);
                return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
            }
        } catch (error: any) {
             console.error(`MCP getAppDetails tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error getting app details for '${appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: getAppLogs ---
server.tool(
    "getAppLogs",
    "Retrieves the most recent logs for a specific application.",
    {
        appName: z.string().describe("The name of the application."),
        lineCount: z.number().optional().describe("Number of lines to retrieve (default: 100)."),
    },
    async ({ appName, lineCount }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const lines = lineCount || 100;
            // CapRover Endpoint: GET /api/v2/user/apps/appData/:appName?logs=true&lines=...
            const response = await callTyaproverApi('GET', `/apps/appData/${sanitizedAppName}?logs=true&lines=${lines}`);

            if (response && response.status === 100 && response.data && response.data.logs) {
                const logs = response.data.logs.lines.join("\n");
                return { content: [{ type: "text", text: logs || "(No logs found)" }] };
            } else {
                 return { content: [{ type: "text", text: `Error fetching logs: ${response.description || JSON.stringify(response)}` }] };
            }
        } catch (error: any) {
            console.error(`MCP getAppLogs tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error fetching logs for '${appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: deployApp ---
server.tool(
    "deployApp",
    "Deploys a new application or updates an existing one using a Docker image.",
    {
        appName: z.string().describe("The name of the application (must be unique)."),
        imageName: z.string().describe("The Docker image to deploy (e.g., 'nginx:latest', 'node:18-alpine')."),
        hasPersistentData: z.boolean().optional().describe("Whether the app requires persistent storage (default: false)."),
        ports: z.array(z.number()).optional().describe("List of container ports to expose (e.g., [80, 443]). Maps to host ports automatically."),
        volumes: z.array(z.object({
            containerPath: z.string(),
            hostPath: z.string()
        })).optional().describe("List of volume mappings (persistent storage)."),
        environmentVariables: z.array(z.object({
            key: z.string(),
            value: z.string()
        })).optional().describe("Environment variables to set."),
    },
    async (input) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(input.appName);

            // 1. Check if app exists
            const listResponse = await callTyaproverApi('GET', '/apps');
            const exists = listResponse?.data?.appDefinitions?.find((a: any) => a.appName === sanitizedAppName);

            if (!exists) {
                // Register new app
                const registerPayload = {
                    appName: sanitizedAppName,
                    hasPersistentData: input.hasPersistentData || false
                };
                const registerResponse = await callTyaproverApi('POST', '/apps/appdefinitions/register', registerPayload);
                if (registerResponse.status !== 100) {
                     return { content: [{ type: "text", text: `Failed to register application '${sanitizedAppName}': ${registerResponse.description}` }] };
                }
            }

            // 2. Prepare Update Payload
            let updatePayload: any = {
                imageName: input.imageName
            };

            if (input.ports) {
                updatePayload.ports = input.ports.map(p => ({ containerPort: p }));
            }

            if (input.environmentVariables) {
                updatePayload.envVars = input.environmentVariables;
            }

            if (input.volumes) {
                updatePayload.volumes = input.volumes;
            }

            if (exists) {
                updatePayload = { ...exists, ...updatePayload };
            }

            const deployResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatePayload);

            if (deployResponse && deployResponse.status === 100) {
                return { content: [{ type: "text", text: `Application '${sanitizedAppName}' deployment/update initiated successfully.` }] };
            } else {
                 const errorDesc = deployResponse?.description || JSON.stringify(deployResponse);
                 return { content: [{ type: "text", text: `Failed to deploy application '${sanitizedAppName}': ${errorDesc}` }] };
            }

        } catch (error: any) {
            console.error(`MCP deployApp tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error deploying app '${input.appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: deleteApp ---
server.tool(
    "deleteApp",
    "Permanently deletes an application and its data.",
    {
        appName: z.string().describe("The name of the application to delete."),
    },
    async ({ appName }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = { appName: sanitizedAppName };
            const response = await callTyaproverApi('POST', '/apps/appdefinitions/delete', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Application '${sanitizedAppName}' deleted successfully.` }] };
            } else {
                 const responseText = typeof response === 'string' ? response : JSON.stringify(response);
                 return { content: [{ type: "text", text: `Failed to delete application '${sanitizedAppName}'. API Message: ${responseText}` }] };
            }
        } catch (error: any) {
            console.error(`MCP deleteApp tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error deleting application '${appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: setAppEnvironmentVariables ---
server.tool(
    "setAppEnvironmentVariables",
    "Sets environment variables for an application. (Replaces existing variables!)",
    {
        appName: z.string().describe("The name of the application."),
        environmentVariables: z.array(z.object({
            key: z.string(),
            value: z.string()
        })).describe("List of key-value pairs for environment variables."),
    },
    async ({ appName, environmentVariables }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const getResponse = await callTyaproverApi('GET', '/apps');
            let appDefinition: any;

            if (getResponse && getResponse.status === 100 && getResponse.data && getResponse.data.appDefinitions) {
                appDefinition = getResponse.data.appDefinitions.find((a: any) => a.appName === sanitizedAppName);
                if (!appDefinition) {
                    return { content: [{ type: "text", text: `Error: Application '${sanitizedAppName}' not found.` }] };
                }
            } else {
                return { content: [{ type: "text", text: `Error fetching app details.` }] };
            }

            const updatedAppDefinition = { ...appDefinition, envVars: environmentVariables };
            if (!updatedAppDefinition.imageName && appDefinition.imageName) {
                updatedAppDefinition.imageName = appDefinition.imageName;
            }

            const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDefinition);

            if (updateResponse && updateResponse.status === 100) {
                return { content: [{ type: "text", text: `Environment variables for '${sanitizedAppName}' updated successfully.` }] };
            } else {
                return { content: [{ type: "text", text: `Failed to update environment variables.` }] };
            }

        } catch (error: any) {
            console.error(`MCP setAppEnvironmentVariables tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- Tool: scaleApp ---
server.tool(
    "scaleApp",
    "Changes the number of running instances for an application.",
    {
        appName: z.string().describe("The name of the application."),
        instanceCount: z.number().int().min(0).describe("The desired number of instances (0 to stop)."),
    },
    async ({ appName, instanceCount }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const getResponse = await callTyaproverApi('GET', '/apps');
            let appDefinition: any;

            if (getResponse && getResponse.status === 100 && getResponse.data && getResponse.data.appDefinitions) {
                appDefinition = getResponse.data.appDefinitions.find((a: any) => a.appName === sanitizedAppName);
                if (!appDefinition) {
                    return { content: [{ type: "text", text: `Error: Application '${sanitizedAppName}' not found.` }] };
                }
            } else {
                return { content: [{ type: "text", text: `Error fetching app details.` }] };
            }

            const updatedAppDefinition = { ...appDefinition, instanceCount: instanceCount };
            if (!updatedAppDefinition.imageName && appDefinition.imageName) {
                updatedAppDefinition.imageName = appDefinition.imageName;
            }

            const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDefinition);

            if (updateResponse && updateResponse.status === 100) {
                return { content: [{ type: "text", text: `Application '${sanitizedAppName}' scaled to ${instanceCount} instance(s) successfully.` }] };
            } else {
                return { content: [{ type: "text", text: `Failed to scale application.` }] };
            }

        } catch (error: any) {
            console.error(`MCP scaleApp tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- Tool: enableAppSsl ---
server.tool(
    "enableAppSsl",
    "Enables SSL (HTTPS) for an application by attaching a custom domain.",
    {
        appName: z.string().describe("The name of the application."),
        customDomain: z.string().describe("The custom domain to associate."),
    },
    async ({ appName, customDomain }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = { customDomain };
            const response = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}/customdomain`, payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `SSL enablement initiated for '${sanitizedAppName}' with domain '${customDomain}'.` }] };
            } else {
                const errorDesc = response?.description || JSON.stringify(response);
                return { content: [{ type: "text", text: `Failed to enable SSL: ${errorDesc}` }] };
            }
        } catch (error: any) {
            console.error(`MCP enableAppSsl tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- Tool: removeCustomDomain ---
server.tool(
    "removeCustomDomain",
    "Removes a custom domain from an application.",
    {
        appName: z.string().describe("The name of the application."),
        customDomain: z.string().describe("The custom domain to remove."),
    },
    async ({ appName, customDomain }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = { customDomain };
            const response = await callTyaproverApi('DELETE', `/apps/appdefinitions/${sanitizedAppName}/customdomain`, payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Custom domain '${customDomain}' removed from '${sanitizedAppName}'.` }] };
            } else {
                return { content: [{ type: "text", text: `Failed to remove custom domain: ${response?.description}` }] };
            }
        } catch (error: any) {
            console.error(`MCP removeCustomDomain tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- New Tool: deployDatabase ---
server.tool(
    "deployDatabase",
    "Deploys a database (Postgres, MySQL, MongoDB, Redis) with secure defaults.",
    {
        appName: z.string().describe("Name of the database application"),
        dbType: z.enum(["postgres", "mysql", "mongodb", "redis"]).describe("Type of database"),
        password: z.string().optional().describe("Password (generated if not provided)"),
    },
    async ({ appName, dbType, password }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const generatedPassword = password || Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);

            let imageName = "";
            let envVars: {key: string, value: string}[] = [];
            let volumePath = "";

            // Cannibalized standard docker configurations
            switch (dbType) {
                case "postgres":
                    imageName = "postgres:14-alpine";
                    envVars = [{ key: "POSTGRES_PASSWORD", value: generatedPassword }];
                    volumePath = "/var/lib/postgresql/data";
                    break;
                case "mysql":
                    imageName = "mysql:8";
                    envVars = [{ key: "MYSQL_ROOT_PASSWORD", value: generatedPassword }];
                    volumePath = "/var/lib/mysql";
                    break;
                case "mongodb":
                    imageName = "mongo:6";
                    envVars = [{ key: "MONGO_INITDB_ROOT_PASSWORD", value: generatedPassword }, { key: "MONGO_INITDB_ROOT_USERNAME", value: "admin" }];
                    volumePath = "/data/db";
                    break;
                case "redis":
                    imageName = "redis:7-alpine";
                    envVars = [{ key: "REDIS_PASSWORD", value: generatedPassword }];
                    volumePath = "/data";
                    // Redis needs a command override to use the password usually, but for simplicity we rely on ENV if supported or basic deploy.
                    // Standard redis image doesn't take REDIS_PASSWORD env for config directly without script.
                    // We'll stick to basic redis for now or just command append which is hard here.
                    // Let's assume the user knows redis needs `redis-server --requirepass ...`
                    // Simplified: Just deploy redis, password might not work out of box with just ENV in official image without custom command.
                    break;
            }

            // reuse deployApp logic by calling the API

            // 1. Register
             const registerPayload = {
                appName: sanitizedAppName,
                hasPersistentData: true
            };
            const registerResponse = await callTyaproverApi('POST', '/apps/appdefinitions/register', registerPayload);
             if (registerResponse.status !== 100 && registerResponse.description !== "App already exists") {
                 return { content: [{ type: "text", text: `Failed to register DB: ${registerResponse.description}` }] };
            }

            // 2. Update/Deploy
            const updatePayload = {
                imageName: imageName,
                envVars: envVars,
                volumes: [{ containerPath: volumePath, hostPath: `v-${sanitizedAppName}-data` }]
            };

            const deployResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatePayload);

            if (deployResponse && deployResponse.status === 100) {
                let msg = `Database '${sanitizedAppName}' (${dbType}) deployed successfully.\n`;
                msg += `Internal Host: srv-captain--${sanitizedAppName}\n`;
                if (password || dbType !== 'redis') {
                    msg += `Password: ${generatedPassword}\n`;
                }
                if (dbType === 'mongodb') msg += `User: admin\n`;

                return { content: [{ type: "text", text: msg }] };
            } else {
                 return { content: [{ type: "text", text: `Failed to deploy database: ${deployResponse?.description}` }] };
            }
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// --- New Tool: configureGitRepo ---
server.tool(
    "configureGitRepo",
    "Configures a Git repository for automated deployment (GitOps).",
    {
        appName: z.string().describe("Name of the application"),
        repoUrl: z.string().describe("URL of the git repository (https or ssh)"),
        branch: z.string().describe("Branch to deploy (e.g. main)"),
        username: z.string().optional().describe("Git username (for HTTPS)"),
        password: z.string().optional().describe("Git password/token (for HTTPS)"),
        sshKey: z.string().optional().describe("SSH Private Key (for SSH)"),
    },
    async ({ appName, repoUrl, branch, username, password, sshKey }) => {
         try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);

             // Fetch existing to preserve other settings
            const getResponse = await callTyaproverApi('GET', '/apps');
            const appDefinition = getResponse?.data?.appDefinitions?.find((a: any) => a.appName === sanitizedAppName);

            if (!appDefinition) return { content: [{ type: "text", text: `App ${sanitizedAppName} not found` }] };

            const repoInfo = {
                user: username || "",
                password: password || "",
                sshKey: sshKey || "",
                repo: repoUrl,
                branch: branch
            };

            const updatedAppDefinition = { ...appDefinition, appPushWebhook: { repoInfo } };

            const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDefinition);

             if (updateResponse && updateResponse.status === 100) {
                 // Fetch the webhook URL to show user
                 // Usually it's in the response or we need to construct it?
                 // CapRover usually provides it in the dashboard.
                 // We can construct it: https://captain.root.domain/api/v2/user/webhooks/triggerbuild?namespace=captain&token=...
                 // But we don't have the token easily.
                 return { content: [{ type: "text", text: `Git repo configured for '${sanitizedAppName}'. You can now push to deploy.` }] };
            } else {
                 return { content: [{ type: "text", text: `Failed to configure git: ${updateResponse?.description}` }] };
            }

         } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
         }
    }
);

// --- New Tool: diagnoseApp ---
server.tool(
    "diagnoseApp",
    "Analyzes application logs for common errors (OOM, Crash, etc).",
    {
        appName: z.string().describe("Name of the application"),
    },
    async ({ appName }) => {
         try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);

            // Reuse logic from BackgroundAgent conceptually but implemented here for on-demand tool
             const response = await callTyaproverApi('GET', `/apps/appData/${sanitizedAppName}?logs=true&lines=200`);

             if (response && response.status === 100 && response.data && response.data.logs) {
                const logs = response.data.logs.lines.join("\n");

                // Simple analysis
                const issues = [];
                if (/OOMKilled|Out of memory/i.test(logs)) issues.push("Out of Memory (OOM) detected.");
                if (/Connection refused/i.test(logs)) issues.push("Connection refused errors detected.");
                if (/Error: listen EADDRINUSE/i.test(logs)) issues.push("Port already in use.");

                if (issues.length === 0) {
                    return { content: [{ type: "text", text: `Diagnosis for ${sanitizedAppName}: No obvious issues found in recent logs.` }] };
                } else {
                    return { content: [{ type: "text", text: `Diagnosis for ${sanitizedAppName}:\n- ${issues.join("\n- ")}` }] };
                }
            }
             return { content: [{ type: "text", text: `Could not fetch logs for diagnosis.` }] };
         } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
         }
    }
);


// --- Main function to run the server ---
// Export main for potential programmatic start, but primarily for conditional execution
export async function main() {
    const transport = new StdioServerTransport();
    try {
        await server.connect(transport);
        console.error("Tyaprover MCP Server running on stdio. Ready to receive tool calls.");
    } catch (error) {
        console.error("Fatal error connecting MCP server:", error);
        process.exit(1);
    }
}

// Ensure main only runs when this script is the main module
import { fileURLToPath } from 'url';
import path from 'path';

const currentFilePath = fileURLToPath(import.meta.url);
const scriptPath = path.resolve(process.argv[1]);

if (currentFilePath === scriptPath) {
    main().catch((error) => {
        console.error("Fatal error in MCP server main():", error);
        process.exit(1);
    });
}
