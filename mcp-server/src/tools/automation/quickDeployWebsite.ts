import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "quickDeployWebsite",
        "Citizen Developer Tool: Deploys a simple website with one command (auto-configures SSL, domain, port 80).",
        {
            websiteName: z.string().describe("Name for your website (e.g., 'mysite')"),
            dockerImage: z.string().describe("Docker image (e.g., 'nginx:latest' for static sites)"),
            customDomain: z.string().optional().describe("Custom domain (e.g., 'mysite.example.com')"),
        },
        async ({ websiteName, dockerImage, customDomain }) => {
            try {
                const sanitized = validateAndSanitizeAppName!(websiteName);

                // Step 1: Register app
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: sanitized,
                    hasPersistentData: false
                });

                // Step 2: Deploy app
                const appDef = {
                    appName: sanitized,
                    imageName: dockerImage,
                    instanceCount: 1,
                    containerHttpPort: 80,
                    hasPersistentData: false,
                    volumes: [],
                    environmentVariables: []
                };

                await callTyaproverApi('POST', `/apps/appdefinitions/${sanitized}`, appDef);

                // Step 3: Enable custom domain if provided
                if (customDomain) {
                    await callTyaproverApi('POST', `/apps/appdefinitions/${sanitized}/customdomain`, {
                        customDomain
                    });

                    // Step 4: Enable SSL for custom domain
                    await callTyaproverApi('POST', `/apps/appdefinitions/${sanitized}/customdomain`, {
                        customDomain,
                        enableHttps: true
                    });
                }

                const result = `✓ Website '${sanitized}' deployed successfully!\n\nAccess at:\n- Default: https://${sanitized}.captain.yourdomain.com${customDomain ? `\n- Custom: https://${customDomain}` : ''}`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error deploying website: ${error.message}` }] };
            }
        }
    );
};
