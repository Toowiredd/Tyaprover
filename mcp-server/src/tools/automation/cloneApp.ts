import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "cloneApp",
        "Citizen Developer Tool: Clone an existing app with all its configuration (perfect for staging/testing).",
        {
            sourceApp: z.string().describe("Name of the app to clone"),
            newAppName: z.string().describe("Name for the cloned app"),
            includeData: z.boolean().optional().describe("Clone data/volumes (default: false)"),
        },
        async ({ sourceApp, newAppName, includeData = false }) => {
            try {
                const sourceSanitized = validateAndSanitizeAppName!(sourceApp);
                const newSanitized = validateAndSanitizeAppName!(newAppName);

                // Get source app definition
                const getResponse = await callTyaproverApi('GET', '/apps');
                let sourceAppDef: any;

                if (getResponse?.status === 100 && getResponse.data?.appDefinitions) {
                    sourceAppDef = getResponse.data.appDefinitions.find((a: any) => a.appName === sourceSanitized);
                    if (!sourceAppDef) {
                        return { content: [{ type: "text", text: `Error: Source app '${sourceSanitized}' not found.` }] };
                    }
                } else {
                    return { content: [{ type: "text", text: "Error fetching app details." }] };
                }

                // Register new app
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: newSanitized,
                    hasPersistentData: includeData && sourceAppDef.hasPersistentData
                });

                // Clone configuration
                const clonedAppDef = {
                    ...sourceAppDef,
                    appName: newSanitized,
                    volumes: includeData ? sourceAppDef.volumes.map((v: any) => ({
                        ...v,
                        volumeName: v.volumeName.replace(sourceSanitized, newSanitized)
                    })) : [],
                    customDomain: [], // Don't clone custom domains
                };

                await callTyaproverApi('POST', `/apps/appdefinitions/${newSanitized}`, clonedAppDef);

                const result = `✓ App cloned successfully!

Source: ${sourceSanitized}
Clone: ${newSanitized}

Cloned Configuration:
- Docker Image: ${sourceAppDef.imageName}
- Instances: ${sourceAppDef.instanceCount}
- Port: ${sourceAppDef.containerHttpPort}
- Environment Variables: ${sourceAppDef.environmentVariables?.length || 0} vars
${includeData ? `- Volumes: ${sourceAppDef.volumes?.length || 0} volumes` : '- Volumes: Not cloned (data not included)'}

Access cloned app at:
https://${newSanitized}.captain.yourdomain.com

Note: ${includeData ? 'Data volumes created but empty (no data copied)' : 'Add custom domain and enable SSL if needed'}`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error cloning app: ${error.message}` }] };
            }
        }
    );
};
