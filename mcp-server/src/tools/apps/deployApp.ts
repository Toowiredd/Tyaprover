import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
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
};
