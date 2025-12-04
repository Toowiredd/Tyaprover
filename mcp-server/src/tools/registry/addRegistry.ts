import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "addRegistry",
    "Adds a new Docker registry.",
    {
        registryUser: z.string().describe("Username for the registry"),
        registryPassword: z.string().describe("Password/Token for the registry"),
        registryDomain: z.string().describe("Domain of the registry (e.g. registry.hub.docker.com or ghcr.io)"),
        registryImagePrefix: z.string().optional().describe("Image prefix (optional, mostly for display/grouping)"),
    },
    async ({ registryUser, registryPassword, registryDomain, registryImagePrefix }) => {
        try {
            const payload = {
                registryUser,
                registryPassword,
                registryDomain,
                registryImagePrefix: registryImagePrefix || ""
            };
            const response = await callTyaproverApi('POST', '/registries/insert/', payload);

            if (response && response.status === 100) {
                 return { content: [{ type: "text", text: `Registry ${registryDomain} added successfully.` }] };
            }
             return { content: [{ type: "text", text: `Failed to add registry: ${response?.description}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
