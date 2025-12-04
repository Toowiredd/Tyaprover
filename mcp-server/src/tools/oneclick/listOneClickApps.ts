import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "listOneClickApps",
    "Lists available One-Click Apps from the repository.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/oneclick/template/list');
             if (response && response.status === 100 && response.data && response.data.oneClickApps) {
                // Returns a potentially large list. We might want to summarize or limit.
                // For now, return the list name and displayName to save tokens.
                const simpleList = response.data.oneClickApps.map((app: any) => ({
                    name: app.name,
                    displayName: app.displayName,
                    description: app.description ? app.description.substring(0, 100) + '...' : ''
                }));
                return { content: [{ type: "text", text: JSON.stringify(simpleList, null, 2) }] };
            }
             return { content: [{ type: "text", text: `Error listing one-click apps: ${response?.description || JSON.stringify(response)}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
