import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "registerApp",
    "Explicitly registers a new application (without deploying).",
    {
        appName: z.string().describe("The name of the application"),
        hasPersistentData: z.boolean().optional().describe("Whether app has persistent data (default: false)"),
    },
    async ({ appName, hasPersistentData }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = {
                appName: sanitizedAppName,
                hasPersistentData: hasPersistentData || false,
            };
            const response = await callTyaproverApi('POST', '/apps/appdefinitions/register', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Application '${sanitizedAppName}' registered successfully.` }] };
            }
            return { content: [{ type: "text", text: `Failed to register app: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
