import { McpServer, McpServerOptionsCapabilities } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from 'node-fetch'; // For making API calls to Tyaprover

// Configuration from environment variables
const TYAPROVER_API_URL = process.env.TYAPROVER_API_URL; // e.g., http://localhost:3000 or https://captain.yourdomain.com
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
