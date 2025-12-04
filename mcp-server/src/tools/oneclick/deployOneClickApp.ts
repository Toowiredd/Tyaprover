import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "deployOneClickApp",
    "Deploys a One-Click App from a template with provided configuration.",
    {
        appName: z.string().describe("Unique name for the deployed app"),
        oneClickTemplate: z.string().describe("Name of the One-Click App template"),
        variables: z.array(z.object({
            key: z.string(),
            value: z.string(),
        })).optional().describe("Template variables (key-value pairs)"),
    },
    async ({ appName, oneClickTemplate, variables }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = {
                appName: sanitizedAppName,
                oneClickTemplate,
                variables: variables || [],
            };
            const response = await callTyaproverApi('POST', '/oneclick/template/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `One-Click App '${sanitizedAppName}' deployed successfully using template '${oneClickTemplate}'.` }] };
            }
            return { content: [{ type: "text", text: `Failed to deploy One-Click App: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
