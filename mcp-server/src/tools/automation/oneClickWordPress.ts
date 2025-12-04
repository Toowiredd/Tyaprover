import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "oneClickWordPress",
        "Citizen Developer Tool: Deploy a complete WordPress site with MySQL database in one click.",
        {
            siteName: z.string().describe("Name for your WordPress site (e.g., 'myblog')"),
            customDomain: z.string().optional().describe("Custom domain (e.g., 'blog.example.com')"),
            adminEmail: z.string().email().optional().describe("WordPress admin email"),
        },
        async ({ siteName, customDomain, adminEmail = "admin@example.com" }) => {
            try {
                const baseName = validateAndSanitizeAppName!(siteName);
                const dbName = `${baseName}-mysql`;
                const wpName = `${baseName}-wp`;

                // Generate secure passwords
                const dbRootPassword = Math.random().toString(36).slice(-16);
                const dbPassword = Math.random().toString(36).slice(-16);
                const wpAdminPassword = Math.random().toString(36).slice(-16);

                // Deploy MySQL database
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: dbName,
                    hasPersistentData: true
                });

                await callTyaproverApi('POST', `/apps/appdefinitions/${dbName}`, {
                    appName: dbName,
                    imageName: "mysql:8",
                    instanceCount: 1,
                    containerHttpPort: 3306,
                    hasPersistentData: true,
                    volumes: [{ containerPath: "/var/lib/mysql", volumeName: `${dbName}-data` }],
                    environmentVariables: [
                        { key: "MYSQL_ROOT_PASSWORD", value: dbRootPassword },
                        { key: "MYSQL_DATABASE", value: "wordpress" },
                        { key: "MYSQL_USER", value: "wordpress" },
                        { key: "MYSQL_PASSWORD", value: dbPassword }
                    ]
                });

                // Deploy WordPress
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: wpName,
                    hasPersistentData: true
                });

                await callTyaproverApi('POST', `/apps/appdefinitions/${wpName}`, {
                    appName: wpName,
                    imageName: "wordpress:latest",
                    instanceCount: 1,
                    containerHttpPort: 80,
                    hasPersistentData: true,
                    volumes: [{ containerPath: "/var/www/html", volumeName: `${wpName}-content` }],
                    environmentVariables: [
                        { key: "WORDPRESS_DB_HOST", value: `srv-captain--${dbName}:3306` },
                        { key: "WORDPRESS_DB_NAME", value: "wordpress" },
                        { key: "WORDPRESS_DB_USER", value: "wordpress" },
                        { key: "WORDPRESS_DB_PASSWORD", value: dbPassword }
                    ]
                });

                // Enable custom domain if provided
                if (customDomain) {
                    await callTyaproverApi('POST', `/apps/appdefinitions/${wpName}/customdomain`, {
                        customDomain,
                        enableHttps: true
                    });
                }

                const result = `✓ WordPress site '${baseName}' deployed successfully!

Access your site at:
- Default: https://${wpName}.captain.yourdomain.com${customDomain ? `\n- Custom: https://${customDomain}` : ''}

WordPress Admin:
- URL: https://${customDomain || `${wpName}.captain.yourdomain.com`}/wp-admin
- Username: admin (setup during first visit)
- Suggested Password: ${wpAdminPassword}
- Email: ${adminEmail}

Database Credentials:
- Host: srv-captain--${dbName}:3306
- Database: wordpress
- User: wordpress
- Password: ${dbPassword}
- Root Password: ${dbRootPassword}

Next Steps:
1. Visit your site and complete WordPress setup
2. Log in to wp-admin
3. Choose a theme and start creating content!

IMPORTANT: Save all credentials securely!`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error deploying WordPress: ${error.message}` }] };
            }
        }
    );
};
