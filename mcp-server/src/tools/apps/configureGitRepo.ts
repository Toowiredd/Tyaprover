import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "configureGitRepo",
    "Configures a Git repository for automated deployment (GitOps).",
    {
        appName: z.string().describe("Name of the application"),
        repoUrl: z.string().describe("URL of the git repository (https or ssh)"),
        branch: z.string().describe("Branch to deploy (e.g. main)"),
        username: z.string().optional().describe("Git username (for HTTPS)"),
        password: z.string().optional().describe("Git password/token (for HTTPS)"),
        sshKey: z.string().optional().describe("SSH Private Key (for SSH)"),
    },
    async ({ appName, repoUrl, branch, username, password, sshKey }) => {
         try {
            const sanitizedAppName = validateAndSanitizeAppName(appName);

             // Fetch existing to preserve other settings
            const getResponse = await callTyaproverApi('GET', '/apps');
            const appDefinition = getResponse?.data?.appDefinitions?.find((a: any) => a.appName === sanitizedAppName);

            if (!appDefinition) return { content: [{ type: "text", text: `App ${sanitizedAppName} not found` }] };

            const repoInfo = {
                user: username || "",
                password: password || "",
                sshKey: sshKey || "",
                repo: repoUrl,
                branch: branch
            };

            const updatedAppDefinition = { ...appDefinition, appPushWebhook: { repoInfo } };

            const updateResponse = await callTyaproverApi('POST', `/apps/appdefinitions/${sanitizedAppName}`, updatedAppDefinition);

             if (updateResponse && updateResponse.status === 100) {
                 // Fetch the webhook URL to show user
                 // Usually it's in the response or we need to construct it?
                 // CapRover usually provides it in the dashboard.
                 // We can construct it: https://captain.root.domain/api/v2/user/webhooks/triggerbuild?namespace=captain&token=...
                 // But we don't have the token easily.
                 return { content: [{ type: "text", text: `Git repo configured for '${sanitizedAppName}'. You can now push to deploy.` }] };
            } else {
                 return { content: [{ type: "text", text: `Failed to configure git: ${updateResponse?.description}` }] };
            }

         } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
         }
    }
);
};
