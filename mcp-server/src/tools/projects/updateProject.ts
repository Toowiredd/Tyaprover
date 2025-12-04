import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "updateProject",
    "Updates an existing project.",
    {
        projectId: z.string().describe("ID of the project to update"),
        projectName: z.string().optional().describe("New project name"),
        description: z.string().optional().describe("New project description"),
    },
    async ({ projectId, projectName, description }) => {
        try {
            const payload: any = { projectId };
            if (projectName) payload.projectName = projectName;
            if (description) payload.description = description;

            const response = await callTyaproverApi('PUT', `/user/projects/${projectId}`, payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Project '${projectId}' updated successfully.` }] };
            }
            return { content: [{ type: "text", text: `Failed to update project: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
