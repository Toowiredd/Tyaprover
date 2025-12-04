import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "get2FAStatus",
    "Retrieves the current 2FA (two-factor authentication) status.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/user/2fa/status/');

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }
            return { content: [{ type: "text", text: `Failed to fetch 2FA status: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
