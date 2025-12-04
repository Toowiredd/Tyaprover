import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "createBackup",
    "Creates a full system backup of CapRover configuration and data.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('POST', '/system/createbackup/', {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Backup created successfully. ${response.data?.downloadToken ? `Download token: ${response.data.downloadToken}` : ''}` }] };
            }
            return { content: [{ type: "text", text: `Failed to create backup: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
