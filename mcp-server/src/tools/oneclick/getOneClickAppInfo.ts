import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getOneClickAppInfo",
    "Retrieves detailed information about a specific One-Click App template.",
    {
        appName: z.string().describe("The name of the One-Click App template"),
    },
    async ({ appName }) => {
        try {
            const response = await callTyaproverApi('GET', `/oneclick/template/app/${encodeURIComponent(appName)}`);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }
            return { content: [{ type: "text", text: `Failed to fetch One-Click App info: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
