import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getRootDomain",
    "Retrieves the root domain configuration for CapRover.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/system/info/');

            if (response?.data?.rootDomain) {
                return { content: [{ type: "text", text: `Root domain: ${response.data.rootDomain}` }] };
            }
            return { content: [{ type: "text", text: "Failed to retrieve root domain." }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
