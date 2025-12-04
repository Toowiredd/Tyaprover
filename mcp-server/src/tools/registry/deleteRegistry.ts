import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "deleteRegistry",
    "Deletes a Docker registry configuration.",
    {
        registryId: z.string().describe("ID of the registry to delete"),
    },
    async ({ registryId }) => {
        try {
            const payload = { registryId };
            const response = await callTyaproverApi('POST', '/registries/delete/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Registry ${registryId} deleted successfully.` }] };
            }
            return { content: [{ type: "text", text: `Failed to delete registry: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
