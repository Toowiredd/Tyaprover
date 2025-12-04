import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "enable2FA",
    "Enables 2FA (two-factor authentication) for the admin account.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('POST', '/user/2fa/enable/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `2FA enabled. QR Code: ${response.data?.qrCode || '(See dashboard)'}` }] };
            }
            return { content: [{ type: "text", text: `Failed to enable 2FA: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
