import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "deleteApp",
    "Permanently deletes an application and its data.",
    {
        appName: z.string().describe("The name of the application to delete."),
    },
    async ({ appName }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = { appName: sanitizedAppName };
            const response = await callTyaproverApi('POST', '/apps/appdefinitions/delete', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Application '${sanitizedAppName}' deleted successfully.` }] };
            } else {
                 const responseText = typeof response === 'string' ? response : JSON.stringify(response);
                 return { content: [{ type: "text", text: `Failed to delete application '${sanitizedAppName}'. API Message: ${responseText}` }] };
            }
        } catch (error: any) {
            console.error(`MCP deleteApp tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error deleting application '${appName}': ${error.message}` }] };
        }
    }
);
};
