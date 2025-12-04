import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "deleteTheme",
    "Deletes a custom theme and reverts to default.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('DELETE', '/user/theme/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "Theme deleted successfully. Reverted to default theme." }] };
            }
            return { content: [{ type: "text", text: `Failed to delete theme: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
