import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "forceSSL",
    "Forces SSL (HTTPS) for a specific application.",
    {
        appName: z.string().describe("The name of the application"),
        isEnabled: z.boolean().describe("Whether to force HTTPS"),
    },
    async ({ appName, isEnabled }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const getResponse = await callTyaproverApi('GET', '/apps');
            let appDefinition: any;

            if (getResponse?.status === 100 && getResponse.data?.appDefinitions) {
                appDefinition = getResponse.data.appDefinitions.find((a: any) => a.appName === sanitizedAppName);
                if (!appDefinition) {
                    return { content: [{ type: "text", text: `Error: App '${sanitizedAppName}' not found.` }] };
                }
            } else {
                return { content: [{ type: "text", text: "Error fetching app details." }] };
            }

            const updatedAppDefinition = { ...appDefinition, forceSsl: isEnabled };
            if (!updatedAppDefinition.imageName && appDefinition.imageName) {
                updatedAppDefinition.imageName = appDefinition.imageName;
            }

            const response = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDefinition);

            if (response?.status === 100) {
                return { content: [{ type: "text", text: `Force SSL ${isEnabled ? 'enabled' : 'disabled'} for '${sanitizedAppName}'.` }] };
            }
            return { content: [{ type: "text", text: "Failed to update force SSL setting." }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
