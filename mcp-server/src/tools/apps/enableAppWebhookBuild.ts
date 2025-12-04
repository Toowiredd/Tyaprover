import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "enableAppWebhookBuild",
    "Enables webhook build trigger for an application (for CI/CD integration).",
    {
        appName: z.string().describe("The name of the application"),
        tokenVersion: z.string().optional().describe("Token version for webhook (generated if not provided)"),
    },
    async ({ appName, tokenVersion }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = {
                appName: sanitizedAppName,
                tokenVersion: tokenVersion || Date.now().toString(),
            };
            const response = await callTyaproverApi('POST', '/apps/webhooks/triggerbuild', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Webhook build enabled for '${sanitizedAppName}'. Token: ${response.data?.token || 'check dashboard'}` }] };
            }
            return { content: [{ type: "text", text: `Failed to enable webhook: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
