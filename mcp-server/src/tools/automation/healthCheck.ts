import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi) => {
    server.tool(
        "healthCheck",
        "Citizen Developer Tool: Comprehensive health check of all your apps and system (one-click diagnostics).",
        {},
        async () => {
            try {
                // Get system status
                const [sysInfo, versionInfo, appsResponse] = await Promise.all([
                    callTyaproverApi('GET', '/system/info/'),
                    callTyaproverApi('GET', '/system/versionInfo/'),
                    callTyaproverApi('GET', '/apps')
                ]);

                const apps = appsResponse?.data?.appDefinitions || [];

                // Analyze app health
                const runningApps = apps.filter((a: any) => a.instanceCount > 0);
                const stoppedApps = apps.filter((a: any) => a.instanceCount === 0);

                // Check for issues
                const issues: string[] = [];

                // Check if any apps have SSL issues
                const appsWithoutSSL = apps.filter((a: any) =>
                    a.customDomain && a.customDomain.length > 0 && !a.hasDefaultSubDomainSsl
                );

                if (appsWithoutSSL.length > 0) {
                    issues.push(`${appsWithoutSSL.length} app(s) without SSL: ${appsWithoutSSL.map((a: any) => a.appName).join(', ')}`);
                }

                // Check for apps with no instances
                if (stoppedApps.length > 0) {
                    issues.push(`${stoppedApps.length} stopped app(s): ${stoppedApps.map((a: any) => a.appName).join(', ')}`);
                }

                const health = issues.length === 0 ? "✓ HEALTHY" : "⚠ NEEDS ATTENTION";

                const result = `${health} - System Health Check

System Information:
- CapRover Version: ${versionInfo?.data?.version || 'Unknown'}
- Root Domain: ${sysInfo?.data?.rootDomain || 'Not set'}

Apps Overview:
- Total Apps: ${apps.length}
- Running: ${runningApps.length}
- Stopped: ${stoppedApps.length}

${issues.length > 0 ? `Issues Found:\n${issues.map(i => `- ${i}`).join('\n')}` : 'No issues detected!'}

Recommendations:
${issues.length === 0 ? '- Everything looks good!' : '- Review and fix the issues listed above'}
- Create a backup if you haven't recently
- Check app logs for any errors

Last checked: ${new Date().toLocaleString()}`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error running health check: ${error.message}` }] };
            }
        }
    );
};
