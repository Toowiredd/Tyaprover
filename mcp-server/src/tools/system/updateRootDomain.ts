import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "updateRootDomain",
    "Updates the root domain for CapRover. WARNING: This can break your setup if misconfigured!",
    {
        rootDomain: z.string().describe("The new root domain (e.g., example.com)"),
    },
    async ({ rootDomain }) => {
        try {
            const payload = { rootDomain };
            const response = await callTyaproverApi('POST', '/system/changerootdomain/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Root domain updated to '${rootDomain}'. CapRover may restart.` }] };
            }
            return { content: [{ type: "text", text: `Failed to update root domain: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
