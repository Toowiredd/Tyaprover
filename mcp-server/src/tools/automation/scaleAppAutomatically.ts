import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "scaleAppAutomatically",
        "Citizen Developer Tool: Automatically scales an app based on simple rules (e.g., 'scale up during business hours').",
        {
            appName: z.string().describe("Name of the app to scale"),
            rule: z.enum(["business-hours", "24-7-high", "night-low", "weekend-low", "custom"]).describe("Scaling rule"),
            businessHoursInstances: z.number().optional().describe("Instances during business hours (9am-5pm, default: 3)"),
            offHoursInstances: z.number().optional().describe("Instances during off-hours (default: 1)"),
        },
        async ({ appName, rule, businessHoursInstances = 3, offHoursInstances = 1 }) => {
            try {
                const sanitized = validateAndSanitizeAppName!(appName);

                // Get app definition
                const getResponse = await callTyaproverApi('GET', '/apps');
                let appDef: any;

                if (getResponse?.status === 100 && getResponse.data?.appDefinitions) {
                    appDef = getResponse.data.appDefinitions.find((a: any) => a.appName === sanitized);
                    if (!appDef) {
                        return { content: [{ type: "text", text: `Error: App '${sanitized}' not found.` }] };
                    }
                } else {
                    return { content: [{ type: "text", text: "Error fetching app details." }] };
                }

                // Determine instance count based on current time and rule
                const now = new Date();
                const hour = now.getHours();
                const day = now.getDay(); // 0 = Sunday, 6 = Saturday

                let targetInstances = offHoursInstances;

                switch (rule) {
                    case "business-hours":
                        // Scale up 9am-5pm on weekdays
                        if (day >= 1 && day <= 5 && hour >= 9 && hour < 17) {
                            targetInstances = businessHoursInstances;
                        }
                        break;
                    case "24-7-high":
                        targetInstances = businessHoursInstances;
                        break;
                    case "night-low":
                        // Low instances 10pm-6am
                        if (hour >= 22 || hour < 6) {
                            targetInstances = offHoursInstances;
                        } else {
                            targetInstances = businessHoursInstances;
                        }
                        break;
                    case "weekend-low":
                        // Low instances on weekends
                        if (day === 0 || day === 6) {
                            targetInstances = offHoursInstances;
                        } else {
                            targetInstances = businessHoursInstances;
                        }
                        break;
                    case "custom":
                        // Use current time to decide (business hours logic)
                        if (hour >= 9 && hour < 17) {
                            targetInstances = businessHoursInstances;
                        }
                        break;
                }

                // Update app with new instance count
                appDef.instanceCount = targetInstances;
                await callTyaproverApi('POST', `/apps/appdefinitions/${sanitized}`, appDef);

                const result = `✓ App '${sanitized}' scaled automatically!

Rule: ${rule}
Current time: ${now.toLocaleString()}
Target instances: ${targetInstances}

Schedule:
- Business hours (9am-5pm weekdays): ${businessHoursInstances} instances
- Off-hours: ${offHoursInstances} instances

Tip: Set up a cron job to run this tool hourly for automatic scaling!`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error scaling app: ${error.message}` }] };
            }
        }
    );
};
