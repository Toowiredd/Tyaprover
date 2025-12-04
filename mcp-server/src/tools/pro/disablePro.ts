import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "disablePro",
    "Disables CapRover Pro features and reverts to community edition.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('POST', '/user/pro/disable/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "CapRover Pro features disabled. Reverted to community edition." }] };
            }
            return { content: [{ type: "text", text: `Failed to disable Pro features: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
