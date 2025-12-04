import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
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
};
