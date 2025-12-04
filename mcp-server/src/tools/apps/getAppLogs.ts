import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getAppLogs",
    "Retrieves the most recent logs for a specific application.",
    {
        appName: z.string().describe("The name of the application."),
        lineCount: z.number().optional().describe("Number of lines to retrieve (default: 100)."),
    },
    async ({ appName, lineCount }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const lines = lineCount || 100;
            // CapRover Endpoint: GET /api/v2/user/apps/appData/:appName?logs=true&lines=...
            const response = await callTyaproverApi('GET', `/apps/appData/${sanitizedAppName}?logs=true&lines=${lines}`);

            if (response && response.status === 100 && response.data && response.data.logs) {
                const logs = response.data.logs.lines.join("\n");
                return { content: [{ type: "text", text: logs || "(No logs found)" }] };
            } else {
                 return { content: [{ type: "text", text: `Error fetching logs: ${response.description || JSON.stringify(response)}` }] };
            }
        } catch (error: any) {
            console.error(`MCP getAppLogs tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error fetching logs for '${appName}': ${error.message}` }] };
        }
    }
);
};
