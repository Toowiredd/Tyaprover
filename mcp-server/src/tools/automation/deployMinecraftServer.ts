import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
        "deployMinecraftServer",
        "Citizen Developer Tool: Deploy a Minecraft server (Java Edition) with one command.",
        {
            serverName: z.string().describe("Name for your Minecraft server"),
            version: z.string().optional().describe("Minecraft version (default: 'latest')"),
            maxPlayers: z.number().optional().describe("Maximum players (default: 20)"),
            difficulty: z.enum(["peaceful", "easy", "normal", "hard"]).optional().describe("Difficulty (default: 'normal')"),
            gameMode: z.enum(["survival", "creative", "adventure", "spectator"]).optional().describe("Game mode (default: 'survival')"),
            memory: z.string().optional().describe("RAM allocation (default: '2G')"),
        },
        async ({ serverName, version = "latest", maxPlayers = 20, difficulty = "normal", gameMode = "survival", memory = "2G" }) => {
            try {
                const sanitized = validateAndSanitizeAppName!(serverName);

                await callTyaproverApi('POST', '/apps/appdefinitions/register', {
                    appName: sanitized,
                    hasPersistentData: true
                });

                await callTyaproverApi('POST', `/apps/appdefinitions/${sanitized}`, {
                    appName: sanitized,
                    imageName: `itzg/minecraft-server:${version}`,
                    instanceCount: 1,
                    containerHttpPort: 25565,
                    hasPersistentData: true,
                    volumes: [{ containerPath: "/data", volumeName: `${sanitized}-world` }],
                    environmentVariables: [
                        { key: "EULA", value: "TRUE" },
                        { key: "MAX_PLAYERS", value: maxPlayers.toString() },
                        { key: "DIFFICULTY", value: difficulty },
                        { key: "MODE", value: gameMode },
                        { key: "MEMORY", value: memory },
                        { key: "VERSION", value: version }
                    ]
                });

                const result = `✓ Minecraft server '${sanitized}' deployed successfully!

Server Configuration:
- Version: ${version}
- Max Players: ${maxPlayers}
- Difficulty: ${difficulty}
- Game Mode: ${gameMode}
- RAM: ${memory}

Connection Info:
- Address: ${sanitized}.captain.yourdomain.com:25565
- Port: 25565

Server Files:
- World data saved to persistent volume
- Edit server.properties via file manager
- Install mods/plugins by uploading to /data

Next Steps:
1. Wait ~2 minutes for server to start
2. Check logs: Use getAppLogs tool
3. Connect with Minecraft client!

Note: Make sure port 25565 is open in your firewall!`;

                return { content: [{ type: "text", text: result }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error deploying Minecraft server: ${error.message}` }] };
            }
        }
    );
};
