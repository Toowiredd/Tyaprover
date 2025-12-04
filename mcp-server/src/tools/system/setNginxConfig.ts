import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "setNginxConfig",
    "Sets custom nginx base configuration. WARNING: Incorrect configuration can break your setup!",
    {
        customValue: z.string().describe("Custom nginx configuration directives"),
    },
    async ({ customValue }) => {
        try {
            const payload = { baseConfig: { customValue } };
            const response = await callTyaproverApi('POST', '/system/nginxconfig/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "Nginx configuration updated successfully. CapRover may restart nginx." }] };
            }
            return { content: [{ type: "text", text: `Failed to update nginx config: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
