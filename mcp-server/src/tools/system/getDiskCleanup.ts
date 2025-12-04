import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getDiskCleanup",
    "Retrieves disk usage information and cleanup recommendations.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/system/cleanup/');

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }
            return { content: [{ type: "text", text: `Failed to fetch disk cleanup info: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
