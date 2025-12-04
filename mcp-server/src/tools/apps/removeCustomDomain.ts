import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
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
};
