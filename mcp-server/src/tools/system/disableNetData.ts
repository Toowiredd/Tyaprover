import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "disableNetData",
    "Disables NetData monitoring.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('POST', '/system/netdata/disable/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "NetData monitoring disabled successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to disable NetData: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
