import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "changePassword",
    "Changes the CapRover admin password.",
    {
        oldPassword: z.string().describe("Current password"),
        newPassword: z.string().min(8).describe("New password (min 8 characters)"),
    },
    async ({ oldPassword, newPassword }) => {
        try {
            const payload = { oldPassword, newPassword };
            const response = await callTyaproverApi('POST', '/user/changepassword/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "Password changed successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to change password: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
