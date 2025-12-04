import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "deployFullStackApp",
        "Citizen Developer Tool: Deploys a full-stack app (frontend + backend + database) with one command.",
        {
            appName: z.string().describe("Base name for your app (e.g., 'myapp')"),
            frontendImage: z.string().describe("Frontend Docker image (e.g., 'nginx:latest')"),
            backendImage: z.string().describe("Backend Docker image (e.g., 'node:18-alpine')"),
            database: z.enum(["postgres", "mysql", "mongodb", "redis"]).describe("Database type"),
            customDomain: z.string().optional().describe("Custom domain for frontend"),
        },
        async ({ appName, frontendImage, backendImage, database, customDomain }) => {
            try {
                const baseName = validateAndSanitizeAppName!(appName);
                const dbName = `${baseName}-db`;
                const backendName = `${baseName}-api`;
                const frontendName = `${baseName}-web`;

                // Generate secure password for database
                const dbPassword = Math.random().toString(36).slice(-16);

                // Step 1: Deploy Database
                const dbConfig: any = {
                    postgres: { image: "postgres:15", port: 5432, user: "postgres", db: baseName },
                    mysql: { image: "mysql:8", port: 3306, user: "root", db: baseName },
                    mongodb: { image: "mongo:7", port: 27017, user: "admin", db: baseName },
                    redis: { image: "redis:7-alpine", port: 6379, user: "", db: "" }
                };

                const db = dbConfig[database];

                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: dbName,
                    hasPersistentData: true
                });

                await callTyaproverApi('POST', `/apps/appdefinitions/${dbName}`, {
                    appName: dbName,
                    imageName: db.image,
                    instanceCount: 1,
                    containerHttpPort: db.port,
                    hasPersistentData: true,
                    volumes: [{ containerPath: `/var/lib/${database}`, volumeName: `${dbName}-data` }],
                    environmentVariables: [
                        { key: `${database.toUpperCase()}_PASSWORD`, value: dbPassword },
                        ...(db.user ? [{ key: `${database.toUpperCase()}_USER`, value: db.user }] : []),
                        ...(db.db ? [{ key: `${database.toUpperCase()}_DATABASE`, value: db.db }] : [])
                    ]
                });

                // Step 2: Deploy Backend API
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: backendName,
                    hasPersistentData: false
                });

                await callTyaproverApi('POST', `/apps/appdefinitions/${backendName}`, {
                    appName: backendName,
                    imageName: backendImage,
                    instanceCount: 1,
                    containerHttpPort: 3000,
                    hasPersistentData: false,
                    environmentVariables: [
                        { key: "DATABASE_URL", value: `${database}://${db.user}:${dbPassword}@srv-captain--${dbName}:${db.port}/${db.db}` },
                        { key: "NODE_ENV", value: "production" }
                    ]
                });

                // Step 3: Deploy Frontend
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: frontendName,
                    hasPersistentData: false
                });

                await callTyaproverApi('POST', `/apps/appdefinitions/${frontendName}`, {
                    appName: frontendName,
                    imageName: frontendImage,
                    instanceCount: 1,
                    containerHttpPort: 80,
                    hasPersistentData: false,
                    environmentVariables: [
                        { key: "API_URL", value: `https://${backendName}.captain.yourdomain.com` }
                    ]
                });

                // Step 4: Enable custom domain for frontend if provided
                if (customDomain) {
                    await callTyaproverApi('POST', `/apps/appdefinitions/${frontendName}/customdomain`, {
                        customDomain,
                        enableHttps: true
                    });
                }

                const result = `✓ Full-stack app '${baseName}' deployed successfully!

Components:
- Database (${database}): srv-captain--${dbName}:${db.port}
- Backend API: https://${backendName}.captain.yourdomain.com
- Frontend: https://${frontendName}.captain.yourdomain.com${customDomain ? `\n- Custom Domain: https://${customDomain}` : ''}

Database Credentials:
- User: ${db.user || 'N/A'}
- Password: ${dbPassword}
- Database: ${db.db || 'N/A'}

IMPORTANT: Save these credentials securely!`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error deploying full-stack app: ${error.message}` }] };
            }
        }
    );
};
