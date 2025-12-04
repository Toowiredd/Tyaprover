import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "listRegistries",
    "Lists configured Docker registries.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/registries/');

            if (response && response.status === 100 && response.data && response.data.registries) {
                return { content: [{ type: "text", text: JSON.stringify(response.data.registries, null, 2) }] };
            }
             return { content: [{ type: "text", text: `Error listing registries: ${response?.description || JSON.stringify(response)}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
