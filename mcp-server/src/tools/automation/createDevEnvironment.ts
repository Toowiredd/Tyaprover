import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "createDevEnvironment",
        "Citizen Developer Tool: Creates a complete development environment (code-server, database, monitoring).",
        {
            envName: z.string().describe("Name for your dev environment (e.g., 'mydev')"),
            language: z.enum(["node", "python", "go", "rust", "java"]).describe("Programming language"),
            includeDatabase: z.boolean().optional().describe("Include PostgreSQL database (default: true)"),
            includeRedis: z.boolean().optional().describe("Include Redis cache (default: true)"),
        },
        async ({ envName, language, includeDatabase = true, includeRedis = true }) => {
            try {
                const baseName = validateAndSanitizeAppName!(envName);

                // Language-specific configurations
                const langConfig: any = {
                    node: { image: "codercom/code-server:latest", extensions: ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"] },
                    python: { image: "codercom/code-server:latest", extensions: ["ms-python.python", "ms-python.vscode-pylance"] },
                    go: { image: "codercom/code-server:latest", extensions: ["golang.go"] },
                    rust: { image: "codercom/code-server:latest", extensions: ["rust-lang.rust-analyzer"] },
                    java: { image: "codercom/code-server:latest", extensions: ["vscjava.vscode-java-pack"] }
                };

                const config = langConfig[language];
                const password = Math.random().toString(36).slice(-16);

                // Deploy Code Server
                const codeServerName = `${baseName}-code`;
                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: codeServerName,
                    hasPersistentData: true
                });

                await callTyaproverApi('POST', `/apps/appdefinitions/${codeServerName}`, {
                    appName: codeServerName,
                    imageName: config.image,
                    instanceCount: 1,
                    containerHttpPort: 8080,
                    hasPersistentData: true,
                    volumes: [
                        { containerPath: "/home/coder/project", volumeName: `${codeServerName}-project` }
                    ],
                    environmentVariables: [
                        { key: "PASSWORD", value: password },
                        { key: "SUDO_PASSWORD", value: password }
                    ]
                });

                let components = [`- Code Server: https://${codeServerName}.captain.yourdomain.com (Password: ${password})`];

                // Deploy PostgreSQL if requested
                if (includeDatabase) {
                    const dbName = `${baseName}-db`;
                    const dbPassword = Math.random().toString(36).slice(-16);

                    await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                        appName: dbName,
                        hasPersistentData: true
                    });

                    await callTyaproverApi('POST', `/apps/appdefinitions/${dbName}`, {
                        appName: dbName,
                        imageName: "postgres:15",
                        instanceCount: 1,
                        containerHttpPort: 5432,
                        hasPersistentData: true,
                        volumes: [{ containerPath: "/var/lib/postgresql/data", volumeName: `${dbName}-data` }],
                        environmentVariables: [
                            { key: "POSTGRES_PASSWORD", value: dbPassword },
                            { key: "POSTGRES_USER", value: "dev" },
                            { key: "POSTGRES_DATABASE", value: baseName }
                        ]
                    });

                    components.push(`- PostgreSQL: srv-captain--${dbName}:5432 (User: dev, Password: ${dbPassword}, DB: ${baseName})`);
                }

                // Deploy Redis if requested
                if (includeRedis) {
                    const redisName = `${baseName}-redis`;

                    await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                        appName: redisName,
                        hasPersistentData: false
                    });

                    await callTyaproverApi('POST', `/apps/appdefinitions/${redisName}`, {
                        appName: redisName,
                        imageName: "redis:7-alpine",
                        instanceCount: 1,
                        containerHttpPort: 6379,
                        hasPersistentData: false
                    });

                    components.push(`- Redis: srv-captain--${redisName}:6379`);
                }

                const result = `✓ Development environment '${baseName}' created successfully!

Language: ${language}
Components:
${components.join('\n')}

Get started:
1. Open Code Server in your browser
2. Install recommended extensions
3. Start coding!

IMPORTANT: Save all credentials securely!`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error creating dev environment: ${error.message}` }] };
            }
        }
    );
};
