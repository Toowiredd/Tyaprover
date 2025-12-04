import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "deleteProject",
    "Deletes a project. WARNING: This does not delete apps within the project!",
    {
        projectId: z.string().describe("ID of the project to delete"),
    },
    async ({ projectId }) => {
        try {
            const response = await callTyaproverApi('DELETE', `/user/projects/${projectId}`, {});

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Project '${projectId}' deleted successfully.` }] };
            }
            return { content: [{ type: "text", text: `Failed to delete project: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
