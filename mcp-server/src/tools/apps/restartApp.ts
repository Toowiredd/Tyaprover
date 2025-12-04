import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "restartApp",
    "Restarts an application (stops and starts).",
    {
        appName: z.string().describe("The name of the application to restart"),
    },
    async ({ appName }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            // First scale to 0, then back to original count
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

            const originalCount = appDefinition.instanceCount || 1;

            // Scale to 0
            const updatedAppDef = { ...appDefinition, instanceCount: 0, imageName: appDefinition.imageName };
            await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDef);

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Scale back up
            updatedAppDef.instanceCount = originalCount;
            const response = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDef);

            if (response?.status === 100) {
                return { content: [{ type: "text", text: `Application '${sanitizedAppName}' restarted successfully.` }] };
            }
            return { content: [{ type: "text", text: "Failed to restart app." }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
