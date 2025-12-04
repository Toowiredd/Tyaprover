import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "setTheme",
    "Sets a custom theme for the CapRover dashboard.",
    {
        themeName: z.string().describe("Name of the theme to apply"),
    },
    async ({ themeName }) => {
        try {
            const payload = { themeName };
            const response = await callTyaproverApi('POST', '/user/theme/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Theme '${themeName}' applied successfully.` }] };
            }
            return { content: [{ type: "text", text: `Failed to set theme: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
