import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "enableNetData",
    "Enables NetData monitoring for system metrics and performance tracking.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('POST', '/system/netdata/enable/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "NetData monitoring enabled successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to enable NetData: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
