import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "updateCaptainVersion",
    "Updates CapRover to the latest version. WARNING: This will restart CapRover!",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('POST', '/system/versionInfo/update/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "CapRover update initiated. The system will restart." }] };
            }
            return { content: [{ type: "text", text: `Failed to update CapRover: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
