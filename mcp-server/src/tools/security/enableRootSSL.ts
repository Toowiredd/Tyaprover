import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "enableRootSSL",
    "Enables SSL for the root CapRover domain (captain.domain.com).",
    {
        emailAddress: z.string().email().describe("Email for Let's Encrypt registration"),
    },
    async ({ emailAddress }) => {
        try {
            const payload = { emailAddress };
            const response = await callTyaproverApi('POST', '/system/enablessl/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "Root SSL enabled successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to enable root SSL: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
