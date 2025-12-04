import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "renameApp",
    "Renames an existing application.",
    {
        oldAppName: z.string().describe("Current application name"),
        newAppName: z.string().describe("New application name"),
    },
    async ({ oldAppName, newAppName }) => {
        try {
            const sanitizedOldName = validateAndSanitizeAppName(oldAppName);
            const sanitizedNewName = validateAndSanitizeAppName(newAppName);
            const payload = { appName: sanitizedOldName, newAppName: sanitizedNewName };
            const response = await callTyaproverApi('POST', '/apps/appdefinitions/rename', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Application renamed from '${sanitizedOldName}' to '${sanitizedNewName}'.` }] };
            }
            return { content: [{ type: "text", text: `Failed to rename app: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
