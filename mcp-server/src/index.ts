import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import fetch from 'node-fetch'; // For making API calls to Tyaprover

// Configuration from environment variables
const TYAPROVER_API_URL = process.env.TYAPROVER_API_URL; // e.g., http://localhost:7474 or https://captain.yourdomain.com
const TYAPROVER_AUTH_TOKEN = process.env.TYAPROVER_AUTH_TOKEN;
const TYAPROVER_NAMESPACE = process.env.TYAPROVER_NAMESPACE || 'captain';
const CAPROVER_API_VERSION = process.env.CAPROVER_API_VERSION || 'v2'; // Or fetch from CapRover constants if possible

if (!TYAPROVER_API_URL || !TYAPROVER_AUTH_TOKEN) {
    console.error("FATAL: TYAPROVER_API_URL and TYAPROVER_AUTH_TOKEN environment variables are required.");
    process.exit(1);
}

const serverCapabilities: McpServerOptionsCapabilities = {
    resources: {}, // Not implementing resource providers in this iteration
    tools: {},     // Tools will be added below
};

const server = new McpServer({
    name: "tyaprover",
    version: "0.1.0",
    capabilities: serverCapabilities,
});

// Export server for testing purposes
export { server };

// --- Helper function to call Tyaprover API ---
async function callTyaproverApi(method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<any> {
    const url = `${TYAPROVER_API_URL}/api/${CAPROVER_API_VERSION}/user${path}`;
    const headers: any = {
        'Content-Type': 'application/json',
        'x-namespace': TYAPROVER_NAMESPACE,
        'x-captain-auth': TYAPROVER_AUTH_TOKEN,
    };

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`Tyaprover API Error (${response.status}): ${errorData} for ${method} ${url}`);
            throw new Error(`Tyaprover API request failed with status ${response.status}: ${errorData}`);
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text(); // Return as text if not JSON
        }

    } catch (error) {
        console.error(`Error calling Tyaprover API: ${error}`);
        throw error; // Re-throw to be caught by tool handler
    }
}

// --- Tool: listApps ---
server.tool(
    "listApps",
    "Lists all deployed applications in the Tyaprover namespace.",
    {}, // No input parameters
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/apps');
            // Assuming the response.data contains { appDefinitions: [] }
            if (response && response.status === 100 && response.data && response.data.appDefinitions) {
                return {
                    content: [{ type: "json_object", json_object: response.data.appDefinitions }],
                };
            } else {
                console.error("Unexpected response structure from Tyaprover listApps:", response);
                return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
            }
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error listing apps: ${error.message}` }] };
        }
    }
);

// --- Tool: getAppDetails ---
server.tool(
    "getAppDetails",
    "Gets detailed information for a specific application.",
    { appName: z.string().describe("The name of the application.") },
    async ({ appName }) => {
        try {
            // CapRover's API to get a single app definition is typically by listing all and filtering,
            // or by accessing a specific app's data which might be structured differently.
            // For simplicity, we'll reuse listApps and filter here.
            // A more direct endpoint might exist or could be added to CapRover for efficiency.
            const response = await callTyaproverApi('GET', '/apps');
            if (response && response.status === 100 && response.data && response.data.appDefinitions) {
                const app = response.data.appDefinitions.find((a: any) => a.appName === appName);
                if (app) {
                    return { content: [{ type: "json_object", json_object: app }] };
                } else {
                    return { content: [{ type: "text", text: `Error: App '${appName}' not found.` }] };
                }
            } else {
                console.error("Unexpected response structure from Tyaprover listApps (for getAppDetails):", response);
                return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
            }
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error getting app details for '${appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: deployNewApp ---
server.tool(
    "deployNewApp",
    "Deploys a new application or updates an existing one. For updates, existing settings not specified will be preserved if possible, but providing specific parameters (like envVars) usually overwrites them.",
    {
        appName: z.string().describe("Unique name for the application."),
        imageName: z.string().describe("Docker image name and tag (e.g., 'nginx:latest')."),
        instanceCount: z.number().int().positive().optional().describe("Number of instances."),
        description: z.string().optional().describe("Application description."),
        environmentVariables: z.array(z.object({ key: z.string(), value: z.string() })).optional().describe("Environment variables."),
        portMappings: z.array(z.object({ containerPort: z.number().int(), hostPort: z.number().int().optional() })).optional().describe("Port mappings."),
        volumes: z.array(z.object({ appName: z.string().describe('Should be the appName for the volume if specific, or a generic volume name.'), hostPath: z.string(), containerPath: z.string() })).optional().describe("Persistent volumes. hostPath is the volume name visible in CapRover, not an absolute server path."),
        captainDefinitionContent: z.string().optional().describe("Raw JSON content of a captain-definition file as a string."),
        gitHash: z.string().optional().describe("For Git-based deployments, the commit hash.")
    },
    async (input) => {
        try {
            // Construct the app definition payload for CapRover API
            // This matches the structure CapRover expects when saving an app definition.
            const appDefinitionPayload: any = {
                appName: input.appName,
                instanceCount: input.instanceCount,
                description: input.description,
                hasPersistentData: !!(input.volumes && input.volumes.length > 0),
                captainDefinitionContent: input.captainDefinitionContent,
                gitHash: input.gitHash,
                ports: input.portMappings, // CapRover uses 'ports' for portMappings
                volumes: input.volumes,
                envVars: input.environmentVariables,
                notExposeAsWebApp: false, // Default to exposing, can be a param if needed
                forceSsl: false, // Default, can be a param
                customDomain: undefined, // Default, can be a param
                imageName: input.imageName,
            };

            // Remove undefined optional fields from payload to avoid issues with CapRover API
            Object.keys(appDefinitionPayload).forEach(key => {
                if (appDefinitionPayload[key] === undefined) {
                    delete appDefinitionPayload[key];
                }
            });

            await callTyaproverApi('POST', `/apps/appdefinitions/${input.appName}`, appDefinitionPayload);
            return { content: [{ type: "text", text: `Application '${input.appName}' deployment/update initiated successfully.` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error deploying app '${input.appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: deleteApp ---
server.tool(
    "deleteApp",
    "Deletes an application. This is a destructive operation and cannot be undone easily.",
    {
        appName: z.string().describe("The name of the application to delete."),
    },
    async ({ appName }) => {
        try {
            // CapRover API for deleting an app is typically DELETE /api/v2/user/apps/appdefinitions/:appName
            // The response is usually a 200 OK with a simple status message if successful.
            const response = await callTyaproverApi('DELETE', `/apps/appdefinitions/${appName}`);

            if (response && response.status === 100) { // Assuming status 100 is OK from BaseApi
                return { content: [{ type: "text", text: `Application '${appName}' deleted successfully. Description: ${response.description}` }] };
            } else if (response && response.description) { // If there's a description even on non-100 status from BaseApi
                console.error(`Error response from Tyaprover deleteApp API: Status ${response.status}, Desc: ${response.description}`);
                return { content: [{ type: "text", text: `Failed to delete application '${appName}'. API Status: ${response.status}, Message: ${response.description}` }] };
            }
            else {
                // Handle cases where response might be plain text or unexpected JSON from non-BaseApi error
                const responseText = typeof response === 'string' ? response : JSON.stringify(response);
                console.error(`Unexpected response from Tyaprover deleteApp API: ${responseText}`);
                return { content: [{ type: "text", text: `Failed to delete application '${appName}'. Unexpected API response: ${responseText}` }] };
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
    "Sets or updates environment variables for an application. This replaces all existing environment variables with the provided set.",
    {
        appName: z.string().describe("The name of the application."),
        environmentVariables: z.array(
            z.object({
                key: z.string().describe("Environment variable key."),
                value: z.string().describe("Environment variable value.")
            })
        ).describe("The complete set of environment variables to apply."),
    },
    async ({ appName, environmentVariables }) => {
        try {
            // Step 1: Fetch existing app definition (reusing logic similar to getAppDetails)
            const getResponse = await callTyaproverApi('GET', '/apps');
            let appDefinition: any;

            if (getResponse && getResponse.status === 100 && getResponse.data && getResponse.data.appDefinitions) {
                appDefinition = getResponse.data.appDefinitions.find((a: any) => a.appName === appName);
                if (!appDefinition) {
                    return { content: [{ type: "text", text: `Error: Application '${appName}' not found.` }] };
                }
            } else {
                const errorDesc = getResponse?.description || JSON.stringify(getResponse);
                return { content: [{ type: "text", text: `Error fetching app details for '${appName}': ${errorDesc}` }] };
            }

            // Step 2: Update environment variables
            // Create a new app definition object to avoid mutating the cached/shared one if any
            const updatedAppDefinition = { ...appDefinition, envVars: environmentVariables };

            // Remove undefined optional fields that might have been added if appDefinition was minimal
            // and ensure essential fields for update are present if needed by API.
            // The CapRover API for app definition update expects a full or near-full definition.
            // For simplicity, we assume 'updatedAppDefinition' has all necessary base fields from the GET.
            // Ensure required fields like 'imageName' are present if they were part of the original appDefinition.
            if (!updatedAppDefinition.imageName && appDefinition.imageName) {
                updatedAppDefinition.imageName = appDefinition.imageName;
            }
            if (updatedAppDefinition.instanceCount === undefined && appDefinition.instanceCount !== undefined) {
                updatedAppDefinition.instanceCount = appDefinition.instanceCount;
            }
            if (updatedAppDefinition.hasPersistentData === undefined && appDefinition.hasPersistentData !== undefined) {
                updatedAppDefinition.hasPersistentData = appDefinition.hasPersistentData;
            }
            // etc. for other potentially required fields if the fetched appDefinition was partial.
            // However, CapRover's /apps endpoint usually returns fairly complete definitions.

            // Step 3: POST the updated app definition
            // This is similar to deployNewApp but we are explicitly updating.
            const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${appName}`, updatedAppDefinition);

            if (updateResponse && updateResponse.status === 100) {
                return { content: [{ type: "text", text: `Environment variables for '${appName}' updated successfully.` }] };
            } else {
                const errorDesc = updateResponse?.description || JSON.stringify(updateResponse);
                return { content: [{ type: "text", text: `Failed to update environment variables for '${appName}': ${errorDesc}` }] };
            }

        } catch (error: any) {
            console.error(`MCP setAppEnvironmentVariables tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error setting environment variables for '${appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: scaleApp ---
server.tool(
    "scaleApp",
    "Changes the number of running instances for an application.",
    {
        appName: z.string().describe("The name of the application."),
        instanceCount: z.number().int().min(0).describe("The desired number of instances (0 to stop the app, if supported by underlying PaaS)."),
    },
    async ({ appName, instanceCount }) => {
        try {
            // Step 1: Fetch existing app definition
            const getResponse = await callTyaproverApi('GET', '/apps');
            let appDefinition: any;

            if (getResponse && getResponse.status === 100 && getResponse.data && getResponse.data.appDefinitions) {
                appDefinition = getResponse.data.appDefinitions.find((a: any) => a.appName === appName);
                if (!appDefinition) {
                    return { content: [{ type: "text", text: `Error: Application '${appName}' not found.` }] };
                }
            } else {
                const errorDesc = getResponse?.description || JSON.stringify(getResponse);
                return { content: [{ type: "text", text: `Error fetching app details for '${appName}': ${errorDesc}` }] };
            }

            // Step 2: Update instance count
            const updatedAppDefinition = { ...appDefinition, instanceCount: instanceCount };

            // Carry over other essential fields (similar to setAppEnvironmentVariables)
            if (!updatedAppDefinition.imageName && appDefinition.imageName) {
                updatedAppDefinition.imageName = appDefinition.imageName;
            }
            if (updatedAppDefinition.hasPersistentData === undefined && appDefinition.hasPersistentData !== undefined) {
                updatedAppDefinition.hasPersistentData = appDefinition.hasPersistentData;
            }
            // Add other fields like envVars, ports, volumes if they are not part of '...' spread from a full appDef.
            // Assuming appDefinition from GET /apps is sufficiently complete.
            if (updatedAppDefinition.envVars === undefined && appDefinition.envVars !== undefined) {
                updatedAppDefinition.envVars = appDefinition.envVars;
            }
            if (updatedAppDefinition.ports === undefined && appDefinition.ports !== undefined) {
                updatedAppDefinition.ports = appDefinition.ports;
            }
            if (updatedAppDefinition.volumes === undefined && appDefinition.volumes !== undefined) {
                updatedAppDefinition.volumes = appDefinition.volumes;
            }


            // Step 3: POST the updated app definition
            const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${appName}`, updatedAppDefinition);

            if (updateResponse && updateResponse.status === 100) {
                return { content: [{ type: "text", text: `Application '${appName}' scaled to ${instanceCount} instance(s) successfully.` }] };
            } else {
                const errorDesc = updateResponse?.description || JSON.stringify(updateResponse);
                return { content: [{ type: "text", text: `Failed to scale application '${appName}': ${errorDesc}` }] };
            }

        } catch (error: any) {
            console.error(`MCP scaleApp tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error scaling application '${appName}': ${error.message}` }] };
        }
    }
);

// --- Tool: enableAppSsl ---
server.tool(
    "enableAppSsl",
    "Enables SSL (HTTPS) for an application by attaching a custom domain and provisioning a certificate.",
    {
        appName: z.string().describe("The name of the application."),
        customDomain: z.string().describe("The custom domain to associate with the app (e.g., 'myapp.example.com')."),
    },
    async ({ appName, customDomain }) => {
        try {
            // CapRover API for enabling SSL / attaching custom domain is typically:
            // POST /api/v2/user/apps/appdefinitions/:appName/customdomain
            // with body { customDomain: "your.domain.com" }
            const payload = { customDomain };
            const response = await callTyaproverApi('POST', `/apps/appdefinitions/${appName}/customdomain`, payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `SSL enablement initiated for '${appName}' with domain '${customDomain}'. ${response.description || ''}`.trim() }] };
            } else {
                const errorDesc = response?.description || JSON.stringify(response);
                console.error(`Error response from Tyaprover enableAppSsl API: ${errorDesc}`);
                return { content: [{ type: "text", text: `Failed to enable SSL for '${appName}' with domain '${customDomain}': ${errorDesc}` }] };
            }
        } catch (error: any) {
            console.error(`MCP enableAppSsl tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error enabling SSL for '${appName}' with domain '${customDomain}': ${error.message}` }] };
        }
    }
);

// --- Tool: removeCustomDomain ---
server.tool(
    "removeCustomDomain",
    "Removes a custom domain from an application. This may also disable SSL if it's the last custom domain.",
    {
        appName: z.string().describe("The name of the application."),
        customDomain: z.string().describe("The custom domain to remove (e.g., 'myapp.example.com')."),
    },
    async ({ appName, customDomain }) => {
        try {
            // CapRover API for removing a custom domain is typically:
            // DELETE /api/v2/user/apps/appdefinitions/:appName/customdomain
            // with body { customDomain: "your.domain.com" }
            const payload = { customDomain };
            // Note: Some DELETE APIs might take parameters differently (e.g., in query string or no body if domain is in URL).
            // Assuming CapRover uses a body for DELETE with customDomain for specificity here.
            // If CapRover expects no body for this DELETE, the `callTyaproverApi` will send `undefined` as body if payload is empty or not given.
            // Let's ensure payload is always an object if the CapRover endpoint expects `application/json` even for DELETE with body.
            const response = await callTyaproverApi('DELETE', `/apps/appdefinitions/${appName}/customdomain`, payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Custom domain '${customDomain}' removed from '${appName}'. ${response.description || ''}`.trim() }] };
            } else {
                const errorDesc = response?.description || JSON.stringify(response);
                console.error(`Error response from Tyaprover removeCustomDomain API: ${errorDesc}`);
                return { content: [{ type: "text", text: `Failed to remove custom domain '${customDomain}' from '${appName}': ${errorDesc}` }] };
            }
        } catch (error: any) {
            console.error(`MCP removeCustomDomain tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error removing custom domain '${customDomain}' from '${appName}': ${error.message}` }] };
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
// Convert current file path (import.meta.url) and process.argv[1] to comparable formats.
// process.argv[1] might be relative or absolute. import.meta.url is a file URL.
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
