import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getAvailableThemes",
    "Lists all available themes for the CapRover dashboard.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/user/theme/available/');

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }
            return { content: [{ type: "text", text: `Failed to fetch available themes: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
