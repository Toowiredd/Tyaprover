import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "cleanupUnusedImages",
    "Cleans up unused Docker images to free disk space.",
    {
        mostRecentLimit: z.number().optional().describe("Keep this many most recent images per app (default: 2)"),
    },
    async ({ mostRecentLimit }) => {
        try {
            const payload = { mostRecentLimit: mostRecentLimit || 2 };
            const response = await callTyaproverApi('POST', '/system/cleanup/images/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Image cleanup completed. ${response.data?.message || ''}` }] };
            }
            return { content: [{ type: "text", text: `Failed to cleanup images: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
