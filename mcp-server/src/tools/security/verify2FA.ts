import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "verify2FA",
    "Verifies a 2FA token for authentication.",
    {
        token: z.string().describe("6-digit 2FA token from authenticator app"),
    },
    async ({ token }) => {
        try {
            const payload = { token };
            const response = await callTyaproverApi('POST', '/user/2fa/verify/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "2FA token verified successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to verify 2FA token: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
