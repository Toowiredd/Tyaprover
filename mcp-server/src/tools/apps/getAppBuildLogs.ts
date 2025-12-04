import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getAppBuildLogs",
    "Retrieves build logs for an application.",
    {
        appName: z.string().describe("The name of the application"),
    },
    async ({ appName }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const response = await callTyaproverApi('GET', `/apps/appData/${sanitizedAppName}?buildLogs=true`);

            if (response?.status === 100 && response.data?.logs) {
                return { content: [{ type: "text", text: response.data.logs.lines?.join("\n") || "(No build logs)" }] };
            }
            return { content: [{ type: "text", text: `Failed to fetch build logs: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
