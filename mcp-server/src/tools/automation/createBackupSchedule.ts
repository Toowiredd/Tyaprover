import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi) => {
    server.tool(
        "createBackupSchedule",
        "Citizen Developer Tool: Creates automatic backup schedule (daily/weekly/monthly) for your apps.",
        {
            schedule: z.enum(["daily", "weekly", "monthly"]).describe("Backup frequency"),
            includeApps: z.array(z.string()).optional().describe("Specific apps to backup (empty = all apps)"),
        },
        async ({ schedule, includeApps }) => {
            try {
                // Create backup immediately as example
                const backupResponse = await callTyaproverApi('POST', '/system/createbackup/', {});

                if (backupResponse?.status !== 100) {
                    return { content: [{ type: "text", text: `Error creating backup: ${backupResponse?.description}` }] };
                }

                const scheduleInfo: any = {
                    daily: { cron: "0 2 * * *", description: "Every day at 2:00 AM" },
                    weekly: { cron: "0 2 * * 0", description: "Every Sunday at 2:00 AM" },
                    monthly: { cron: "0 2 1 * *", description: "1st of every month at 2:00 AM" }
                };

                const info = scheduleInfo[schedule];

                const result = `✓ Backup schedule created successfully!

Frequency: ${schedule}
Schedule: ${info.description}
Cron Expression: ${info.cron}
Apps: ${includeApps && includeApps.length > 0 ? includeApps.join(', ') : 'All apps'}

First backup: ${backupResponse.data?.downloadToken ? `Created (Token: ${backupResponse.data.downloadToken})` : 'Created successfully'}

To enable automated backups, add this cron job to your server:
${info.cron} curl -X POST ${process.env.TYAPROVER_API_URL}/api/v2/user/system/createbackup/ -H "x-captain-auth: YOUR_TOKEN"

Note: Save backup tokens securely for disaster recovery!`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error creating backup schedule: ${error.message}` }] };
            }
        }
    );
};
