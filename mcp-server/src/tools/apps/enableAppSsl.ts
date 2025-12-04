import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "enableAppSsl",
    "Enables SSL (HTTPS) for an application by attaching a custom domain.",
    {
        appName: z.string().describe("The name of the application."),
        customDomain: z.string().describe("The custom domain to associate."),
    },
    async ({ appName, customDomain }) => {
        try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);
            const payload = { customDomain };
            const response = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}/customdomain`, payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `SSL enablement initiated for '${sanitizedAppName}' with domain '${customDomain}'.` }] };
            } else {
                const errorDesc = response?.description || JSON.stringify(response);
                return { content: [{ type: "text", text: `Failed to enable SSL: ${errorDesc}` }] };
            }
        } catch (error: any) {
            console.error(`MCP enableAppSsl tool error: ${error.message}`);
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
