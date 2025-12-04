import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "createProject",
    "Creates a new project (group of applications).",
    {
        projectName: z.string().describe("Name of the project"),
        description: z.string().optional().describe("Project description"),
    },
    async ({ projectName, description }) => {
        try {
            const payload = { projectName, description: description || "" };
            const response = await callTyaproverApi('POST', '/user/projects/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Project '${projectName}' created successfully.` }] };
            }
            return { content: [{ type: "text", text: `Failed to create project: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
