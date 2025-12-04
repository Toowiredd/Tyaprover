import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "updateRegistry",
    "Updates an existing Docker registry configuration.",
    {
        registryId: z.string().describe("ID of the registry to update"),
        registryUser: z.string().optional().describe("Username for the registry"),
        registryPassword: z.string().optional().describe("Password/Token for the registry"),
        registryDomain: z.string().optional().describe("Domain of the registry"),
        registryImagePrefix: z.string().optional().describe("Image prefix"),
    },
    async (input) => {
        try {
            const payload: any = { id: input.registryId };
            if (input.registryUser) payload.registryUser = input.registryUser;
            if (input.registryPassword) payload.registryPassword = input.registryPassword;
            if (input.registryDomain) payload.registryDomain = input.registryDomain;
            if (input.registryImagePrefix !== undefined) payload.registryImagePrefix = input.registryImagePrefix;

            const response = await callTyaproverApi('POST', '/registries/update/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Registry ${input.registryId} updated successfully.` }] };
            }
            return { content: [{ type: "text", text: `Failed to update registry: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
