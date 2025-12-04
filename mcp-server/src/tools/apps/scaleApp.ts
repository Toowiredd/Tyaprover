import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
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
};
