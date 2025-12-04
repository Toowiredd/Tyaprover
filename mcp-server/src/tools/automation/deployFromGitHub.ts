import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "deployFromGitHub",
        "Citizen Developer Tool: Deploys an app directly from a GitHub repository (auto-detects Dockerfile).",
        {
            appName: z.string().describe("Name for your app"),
            githubRepo: z.string().describe("GitHub repository (e.g., 'owner/repo')"),
            branch: z.string().optional().describe("Git branch (default: 'main')"),
            githubToken: z.string().optional().describe("GitHub personal access token (for private repos)"),
            port: z.number().optional().describe("Container port (default: 3000)"),
            envVars: z.array(z.object({
                key: z.string(),
                value: z.string()
            })).optional().describe("Environment variables"),
        },
        async ({ appName, githubRepo, branch = "main", githubToken, port = 3000, envVars = [] }) => {
            try {
                const sanitized = validateAndSanitizeAppName!(appName);

                // Register app
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: sanitized,
                    hasPersistentData: false
                });

                // Configure Git repository
                const repoUrl = `https://github.com/${githubRepo}`;
                const payload: any = {
                    repo: repoUrl,
                    branch,
                    user: githubToken ? "git" : undefined,
                    password: githubToken
                };

                await callTyaproverApi('POST', `/apps/appdefinitions/${sanitized}/reconfigure`, payload);

                // Get app definition and update
                const getResponse = await callTyaproverApi('GET', '/apps');
                let appDef: any;

                if (getResponse?.status === 100 && getResponse.data?.appDefinitions) {
                    appDef = getResponse.data.appDefinitions.find((a: any) => a.appName === sanitized);
                } else {
                    throw new Error("Failed to fetch app details");
                }

                // Update app configuration
                appDef.containerHttpPort = port;
                appDef.instanceCount = 1;
                appDef.environmentVariables = envVars;

                await callTyaproverApi('POST', `/apps/appdefinitions/${sanitized}`, appDef);

                const result = `✓ App '${sanitized}' configured for GitHub deployment!

Repository: ${repoUrl}
Branch: ${branch}
Port: ${port}

Next steps:
1. Ensure your repo has a Dockerfile
2. Push code to trigger auto-deployment
3. Access at: https://${sanitized}.captain.yourdomain.com

Tip: Enable webhook for automatic deployments on git push!`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error deploying from GitHub: ${error.message}` }] };
            }
        }
    );
};
