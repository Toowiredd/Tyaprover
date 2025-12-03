import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
const server = new McpServer({
    name: "tyaprover",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Export server for testing purposes
export { server };
// --- Helpers ---
// Helper function to make API calls to Tyaprover
async function callTyaproverApi(method, endpoint, body) {
    const url = `${TYAPROVER_API_URL}/api/${CAPROVER_API_VERSION}/${TYAPROVER_NAMESPACE}${endpoint}`;
    const headers = {
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
        }
        else {
            const text = await response.text();
            if (!response.ok) {
                return { status: response.status, description: text }; // Mimic CapRover error structure if text
            }
            return text;
        }
    }
    catch (error) {
        console.error(`API Call failed: ${method} ${url}`, error);
        throw new Error(`Tyaprover API request failed with status ${error.status || 'unknown'}: ${error.message}`);
    }
}
// Helper to validate and sanitize app names
function validateAndSanitizeAppName(appName) {
    if (!appName) {
        throw new Error("App name is required.");
    }
    // CapRover app names usually limited to lowercase alphanumeric, hyphen, maybe underscore.
    // Let's enforce a safe subset: lowercase alphanumeric and hyphens.
    // Also, CapRover apps cannot start with a hyphen.
    const sanitized = appName.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!sanitized) {
        throw new Error(`Invalid app name '${appName}'. App names must contain alphanumeric characters.`);
    }
    if (sanitized.length > 50) {
        throw new Error(`App name '${appName}' is too long. Max 50 characters.`);
    }
    return sanitized;
}
// --- Tool: listApps ---
server.tool("listApps", "Lists all applications currently deployed on the Tyaprover server.", {}, async () => {
    try {
        const response = await callTyaproverApi('GET', '/apps');
        // CapRover response structure for /apps is usually { status: 100, description: "...", data: { appDefinitions: [...] } }
        // Or sometimes just the list depending on endpoint version. Assuming standard CapRover v2 response.
        // Assuming the response.data contains { appDefinitions: [] }
        if (response && response.status === 100 && response.data && response.data.appDefinitions) {
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.appDefinitions) }],
            };
        }
        else {
            console.error("Unexpected response structure from Tyaprover listApps:", response);
            return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
        }
    }
    catch (error) {
        console.error("MCP listApps tool error:", error);
        return { content: [{ type: "text", text: `Error listing apps: ${error.message}` }] };
    }
});
// --- Tool: getAppDetails ---
server.tool("getAppDetails", "Retrieves detailed configuration and status for a specific application.", {
    appName: z.string().describe("The name of the application to inspect."),
}, async ({ appName }) => {
    try {
        // BUG FIX #2 & #10: Validate app name
        const sanitizedAppName = validateAndSanitizeAppName(appName);
        // Using listApps and filtering, as CapRover might not have a direct single-app GET that returns everything in one go without complexity.
        // Or use /user/apps/appDefinitions/:appName if available.
        // Let's try the list approach for safety as we know /apps works.
        const response = await callTyaproverApi('GET', '/apps');
        if (response && response.status === 100 && response.data && response.data.appDefinitions) {
            const app = response.data.appDefinitions.find((a) => a.appName === sanitizedAppName);
            if (app) {
                return { content: [{ type: "text", text: JSON.stringify(app) }] };
            }
            else {
                return { content: [{ type: "text", text: `Error: App '${sanitizedAppName}' not found.` }] };
            }
        }
        else {
            console.error("Unexpected response structure from Tyaprover getAppDetails:", response);
            return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
        }
    }
    catch (error) {
        console.error(`MCP getAppDetails tool error: ${error.message}`);
        return { content: [{ type: "text", text: `Error getting app details for '${appName}': ${error.message}` }] };
    }
});
// --- Tool: deployApp ---
server.tool("deployApp", "Deploys a new application or updates an existing one using a Docker image.", {
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
}, async (input) => {
    try {
        // BUG FIX #2 & #10: Validate app name
        const sanitizedAppName = validateAndSanitizeAppName(input.appName);
        // 1. Check if app exists
        const listResponse = await callTyaproverApi('GET', '/apps');
        const exists = listResponse?.data?.appDefinitions?.find((a) => a.appName === sanitizedAppName);
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
        let updatePayload = {
            imageName: input.imageName
        };
        // Add Ports if provided (CapRover typically uses 'ports' field as array of mapped ports)
        // CapRover structure: ports: [ { containerPort: 80, hostPort: 80 } ] or just exposed container ports depending on usage.
        // Simplified: If user provides [80], we assume they want to expose 80.
        if (input.ports) {
            updatePayload.ports = input.ports.map(p => ({ containerPort: p }));
        }
        // Add Env Vars if provided
        if (input.environmentVariables) {
            updatePayload.envVars = input.environmentVariables;
        }
        // Add Volumes if provided
        if (input.volumes) {
            updatePayload.volumes = input.volumes;
        }
        // If app exists, we must merge with existing definition to avoid wiping other settings
        if (exists) {
            // Merge: Existing takes precedence? No, input takes precedence.
            // But we must keep existing stuff if not provided in input.
            // e.g. if input.ports is undefined, keep exists.ports
            updatePayload = { ...exists, ...updatePayload };
        }
        // Endpoint: POST /api/v2/user/apps/appDefinitions/:appName
        const deployResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatePayload);
        if (deployResponse && deployResponse.status === 100) {
            return { content: [{ type: "text", text: `Application '${sanitizedAppName}' deployment/update initiated successfully.` }] };
        }
        else {
            const errorDesc = deployResponse?.description || JSON.stringify(deployResponse);
            return { content: [{ type: "text", text: `Failed to deploy application '${sanitizedAppName}': ${errorDesc}` }] };
        }
    }
    catch (error) {
        console.error(`MCP deployApp tool error: ${error.message}`);
        return { content: [{ type: "text", text: `Error deploying app '${input.appName}': ${error.message}` }] };
    }
});
// --- Tool: deleteApp ---
server.tool("deleteApp", "Permanently deletes an application and its data.", {
    appName: z.string().describe("The name of the application to delete."),
}, async ({ appName }) => {
    try {
        // BUG FIX #2 & #10: Validate app name
        const sanitizedAppName = validateAndSanitizeAppName(appName);
        // Endpoint: POST /api/v2/user/apps/appDefinitions/delete
        // Body: { appName: "..." }
        const payload = { appName: sanitizedAppName };
        const response = await callTyaproverApi('POST', '/apps/appdefinitions/delete', payload);
        if (response && response.status === 100) {
            return { content: [{ type: "text", text: `Application '${sanitizedAppName}' deleted successfully. Description: ${response.description}` }] };
        }
        else if (response && response.status) {
            // CapRover might return other statuses for errors
            return { content: [{ type: "text", text: `Failed to delete application '${sanitizedAppName}'. API Status: ${response.status}, Message: ${response.description}` }] };
        }
        else {
            // Handle plain text or unexpected JSON from non-BaseApi error
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            console.error(`Unexpected response from Tyaprover deleteApp API: ${responseText}`);
            return { content: [{ type: "text", text: `Failed to delete application '${sanitizedAppName}'. Unexpected API response: ${responseText}` }] };
        }
    }
    catch (error) {
        console.error(`MCP deleteApp tool error: ${error.message}`);
        return { content: [{ type: "text", text: `Error deleting application '${appName}': ${error.message}` }] };
    }
});
// --- Tool: setAppEnvironmentVariables ---
server.tool("setAppEnvironmentVariables", "Sets environment variables for an application. (Replaces existing variables!)", {
    appName: z.string().describe("The name of the application."),
    environmentVariables: z.array(z.object({
        key: z.string(),
        value: z.string()
    })).describe("List of key-value pairs for environment variables."),
}, async ({ appName, environmentVariables }) => {
    try {
        // BUG FIX #2 & #10: Validate app name
        const sanitizedAppName = validateAndSanitizeAppName(appName);
        // Step 1: Fetch existing app definition (reusing logic similar to getAppDetails)
        const getResponse = await callTyaproverApi('GET', '/apps');
        let appDefinition;
        if (getResponse && getResponse.status === 100 && getResponse.data && getResponse.data.appDefinitions) {
            appDefinition = getResponse.data.appDefinitions.find((a) => a.appName === sanitizedAppName);
            if (!appDefinition) {
                return { content: [{ type: "text", text: `Error: Application '${sanitizedAppName}' not found.` }] };
            }
        }
        else {
            const errorDesc = getResponse?.description || JSON.stringify(getResponse);
            return { content: [{ type: "text", text: `Error fetching app details for '${sanitizedAppName}': ${errorDesc}` }] };
        }
        // Step 2: Update environment variables
        // appDefinition.envVars is the array.
        // Note: CapRover's update endpoint usually replaces the whole 'envVars' array.
        // If the user wants to *append*, they should fetch first. But this tool description says "Replaces".
        // We should stick to "Replaces" or implement merge logic. Let's strictly follow input for now (Replace).
        const updatedAppDefinition = { ...appDefinition, envVars: environmentVariables };
        // Be careful not to overwrite other fields with undefined if we only send partial updates,
        // but CapRover usually expects the full definition or at least the fields being changed + crucial ones.
        // A safer bet with CapRover API is to send back the modified full definition we just fetched.
        // We already did `{ ...appDefinition, ... }` so we are good.
        // However, we must ensure we don't accidentally unset things if the GET response was partial?
        // Usually /apps returns full info.
        // One detail: 'envVars' in CapRover might need to be [{key:.., value:..}]. valid.
        // Ensure other critical fields are present if needed by the API validation?
        // e.g. 'appName', 'imageName'. they are in appDefinition.
        // BUG FIX #25: Ensure 'instanceCount' is not lost if not in input (it's not).
        // It is in appDefinition, so it is preserved.
        // BUG FIX: The API might reject if we send back 'isAppBuilding', 'status', etc. readonly fields.
        // But usually CapRover ignores them.
        // One explicit thing: ensure 'imageName' is set.
        if (!updatedAppDefinition.imageName && appDefinition.imageName) {
            updatedAppDefinition.imageName = appDefinition.imageName;
        }
        // Step 3: POST the updated app definition
        // This is similar to deployNewApp but we are explicitly updating.
        const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDefinition);
        if (updateResponse && updateResponse.status === 100) {
            return { content: [{ type: "text", text: `Environment variables for '${sanitizedAppName}' updated successfully.` }] };
        }
        else {
            const errorDesc = updateResponse?.description || JSON.stringify(updateResponse);
            return { content: [{ type: "text", text: `Failed to update environment variables for '${sanitizedAppName}': ${errorDesc}` }] };
        }
    }
    catch (error) {
        console.error(`MCP setAppEnvironmentVariables tool error: ${error.message}`);
        return { content: [{ type: "text", text: `Error setting environment variables for '${appName}': ${error.message}` }] };
    }
});
// --- Tool: scaleApp ---
server.tool("scaleApp", "Changes the number of running instances for an application.", {
    appName: z.string().describe("The name of the application."),
    instanceCount: z.number().int().min(0).describe("The desired number of instances (0 to stop the app, if supported by underlying PaaS)."),
}, async ({ appName, instanceCount }) => {
    try {
        // BUG FIX #2 & #10: Validate app name
        const sanitizedAppName = validateAndSanitizeAppName(appName);
        // Step 1: Fetch existing app definition
        const getResponse = await callTyaproverApi('GET', '/apps');
        let appDefinition;
        if (getResponse && getResponse.status === 100 && getResponse.data && getResponse.data.appDefinitions) {
            appDefinition = getResponse.data.appDefinitions.find((a) => a.appName === sanitizedAppName);
            if (!appDefinition) {
                return { content: [{ type: "text", text: `Error: Application '${sanitizedAppName}' not found.` }] };
            }
        }
        else {
            const errorDesc = getResponse?.description || JSON.stringify(getResponse);
            return { content: [{ type: "text", text: `Error fetching app details for '${sanitizedAppName}': ${errorDesc}` }] };
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
        const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDefinition);
        if (updateResponse && updateResponse.status === 100) {
            return { content: [{ type: "text", text: `Application '${sanitizedAppName}' scaled to ${instanceCount} instance(s) successfully.` }] };
        }
        else {
            const errorDesc = updateResponse?.description || JSON.stringify(updateResponse);
            return { content: [{ type: "text", text: `Failed to scale application '${sanitizedAppName}': ${errorDesc}` }] };
        }
    }
    catch (error) {
        console.error(`MCP scaleApp tool error: ${error.message}`);
        return { content: [{ type: "text", text: `Error scaling application '${appName}': ${error.message}` }] };
    }
});
// --- Tool: enableAppSsl ---
server.tool("enableAppSsl", "Enables SSL (HTTPS) for an application by attaching a custom domain and provisioning a certificate.", {
    appName: z.string().describe("The name of the application."),
    customDomain: z.string().describe("The custom domain to associate with the app (e.g., 'myapp.example.com')."),
}, async ({ appName, customDomain }) => {
    try {
        // BUG FIX #2 & #10: Validate app name
        const sanitizedAppName = validateAndSanitizeAppName(appName);
        // CapRover API for enabling SSL / attaching custom domain is typically:
        // POST /api/v2/user/apps/appdefinitions/:appName/customdomain
        // with body { customDomain: "your.domain.com" }
        const payload = { customDomain };
        const response = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}/customdomain`, payload);
        if (response && response.status === 100) {
            return { content: [{ type: "text", text: `SSL enablement initiated for '${sanitizedAppName}' with domain '${customDomain}'. ${response.description || ''}`.trim() }] };
        }
        else {
            const errorDesc = response?.description || JSON.stringify(response);
            console.error(`Error response from Tyaprover enableAppSsl API: ${errorDesc}`);
            return { content: [{ type: "text", text: `Failed to enable SSL for '${sanitizedAppName}' with domain '${customDomain}': ${errorDesc}` }] };
        }
    }
    catch (error) {
        console.error(`MCP enableAppSsl tool error: ${error.message}`);
        return { content: [{ type: "text", text: `Error enabling SSL for '${appName}' with domain '${customDomain}': ${error.message}` }] };
    }
});
// --- Tool: removeCustomDomain ---
server.tool("removeCustomDomain", "Removes a custom domain from an application. This may also disable SSL if it's the last custom domain.", {
    appName: z.string().describe("The name of the application."),
    customDomain: z.string().describe("The custom domain to remove (e.g., 'myapp.example.com')."),
}, async ({ appName, customDomain }) => {
    try {
        // BUG FIX #2 & #10: Validate app name
        const sanitizedAppName = validateAndSanitizeAppName(appName);
        // CapRover API for removing a custom domain is typically:
        // DELETE /api/v2/user/apps/appdefinitions/:appName/customdomain
        // with body { customDomain: "your.domain.com" }
        const payload = { customDomain };
        // Note: Some DELETE APIs might take parameters differently (e.g., in query string or no body if domain is in URL).
        // Assuming CapRover uses a body for DELETE with customDomain for specificity here.
        // If CapRover expects no body for this DELETE, the `callTyaproverApi` will send `undefined` as body if payload is empty or not given.
        // Let's ensure payload is always an object if the CapRover endpoint expects `application/json` even for DELETE with body.
        const response = await callTyaproverApi('DELETE', `/apps/appdefinitions/${sanitizedAppName}/customdomain`, payload);
        if (response && response.status === 100) {
            return { content: [{ type: "text", text: `Custom domain '${customDomain}' removed from '${sanitizedAppName}'. ${response.description || ''}`.trim() }] };
        }
        else {
            const errorDesc = response?.description || JSON.stringify(response);
            console.error(`Error response from Tyaprover removeCustomDomain API: ${errorDesc}`);
            return { content: [{ type: "text", text: `Failed to remove custom domain '${customDomain}' from '${sanitizedAppName}': ${errorDesc}` }] };
        }
    }
    catch (error) {
        console.error(`MCP removeCustomDomain tool error: ${error.message}`);
        return { content: [{ type: "text", text: `Error removing custom domain '${customDomain}' from '${appName}': ${error.message}` }] };
    }
});
// --- Main function to run the server ---
// Export main for potential programmatic start, but primarily for conditional execution
export async function main() {
    const transport = new StdioServerTransport();
    try {
        await server.connect(transport);
        console.error("Tyaprover MCP Server running on stdio. Ready to receive tool calls.");
    }
    catch (error) {
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
