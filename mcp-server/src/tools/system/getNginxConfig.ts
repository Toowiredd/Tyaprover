import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getNginxConfig",
    "Retrieves the current nginx base configuration.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/system/nginxconfig/');

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: response.data?.baseConfig?.customValue || "(No custom nginx config)" }] };
            }
            return { content: [{ type: "text", text: `Failed to fetch nginx config: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
