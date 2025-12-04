import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "disable2FA",
    "Disables 2FA (two-factor authentication) for the admin account.",
    {
        token: z.string().describe("Current 2FA token to confirm disabling"),
    },
    async ({ token }) => {
        try {
            const payload = { token };
            const response = await callTyaproverApi('POST', '/user/2fa/disable/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "2FA disabled successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to disable 2FA: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
