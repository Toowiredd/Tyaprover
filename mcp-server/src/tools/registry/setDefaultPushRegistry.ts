import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "setDefaultPushRegistry",
    "Sets the default registry for pushing Docker images.",
    {
        registryId: z.string().describe("ID of the registry to set as default"),
    },
    async ({ registryId }) => {
        try {
            const payload = { registryId };
            const response = await callTyaproverApi('POST', '/registries/setdefaultpushregistry/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Registry ${registryId} set as default push registry.` }] };
            }
            return { content: [{ type: "text", text: `Failed to set default registry: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
