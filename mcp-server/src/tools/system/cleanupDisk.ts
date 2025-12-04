import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "cleanupDisk",
    "Performs disk cleanup including unused volumes and containers.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('POST', '/system/cleanup/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "Disk cleanup completed successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to cleanup disk: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
