import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "diagnoseApp",
    "Analyzes application logs for common errors (OOM, Crash, etc).",
    {
        appName: z.string().describe("Name of the application"),
    },
    async ({ appName }) => {
         try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);

            // Reuse logic from BackgroundAgent conceptually but implemented here for on-demand tool
             const response = await callTyaproverApi('GET', `/apps/appData/${sanitizedAppName}?logs=true&lines=200`);

             if (response && response.status === 100 && response.data && response.data.logs) {
                const logs = response.data.logs.lines.join("\n");

                // Simple analysis
                const issues = [];
                if (/OOMKilled|Out of memory/i.test(logs)) issues.push("Out of Memory (OOM) detected.");
                if (/Connection refused/i.test(logs)) issues.push("Connection refused errors detected.");
                if (/Error: listen EADDRINUSE/i.test(logs)) issues.push("Port already in use.");

                if (issues.length === 0) {
                    return { content: [{ type: "text", text: `Diagnosis for ${sanitizedAppName}: No obvious issues found in recent logs.` }] };
                } else {
                    return { content: [{ type: "text", text: `Diagnosis for ${sanitizedAppName}:\n- ${issues.join("\n- ")}` }] };
                }
            }
             return { content: [{ type: "text", text: `Could not fetch logs for diagnosis.` }] };
         } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
         }
    }
);
};
