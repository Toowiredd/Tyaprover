import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getAppDetails",
    "Retrieves detailed configuration and status for a specific application.",
    {
        appName: z.string().describe("The name of the application to inspect."),
    },
    async ({ appName }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const response = await callTyaproverApi('GET', '/apps');

            if (response && response.status === 100 && response.data && response.data.appDefinitions) {
                const app = response.data.appDefinitions.find((a: any) => a.appName === sanitizedAppName);
                if (app) {
                    return { content: [{ type: "text", text: JSON.stringify(app) }] };
                } else {
                    return { content: [{ type: "text", text: `Error: App '${sanitizedAppName}' not found.` }] };
                }
            } else {
                 console.error("Unexpected response structure from Tyaprover getAppDetails:", response);
                return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
            }
        } catch (error: any) {
             console.error(`MCP getAppDetails tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error getting app details for '${appName}': ${error.message}` }] };
        }
    }
);
};
