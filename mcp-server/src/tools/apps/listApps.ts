import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "listApps",
    "Lists all applications currently deployed on the Tyaprover server.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/apps');
            if (response && response.status === 100 && response.data && response.data.appDefinitions) {
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.appDefinitions) }],
                };
            } else {
                console.error("Unexpected response structure from Tyaprover listApps:", response);
                return { content: [{ type: "text", text: `Error: Unexpected API response structure. Status: ${response.status}, Description: ${response.description}` }] };
            }
        } catch (error: any) {
            console.error("MCP listApps tool error:", error);
            return { content: [{ type: "text", text: `Error listing apps: ${error.message}` }] };
        }
    }
);
};
