import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fetch from 'node-fetch';
import { BackgroundAgent } from "./BackgroundAgent.js";
import { registerAllTools } from "./tools/registry.js";

// Configuration from environment variables
const TYAPROVER_API_URL = process.env.TYAPROVER_API_URL;
const TYAPROVER_AUTH_TOKEN = process.env.TYAPROVER_AUTH_TOKEN;
const TYAPROVER_NAMESPACE = process.env.TYAPROVER_NAMESPACE || 'user';
const CAPROVER_API_VERSION = process.env.CAPROVER_API_VERSION || 'v2';
const ENABLE_AUTONOMOUS_AGENT = process.env.TYAPROVER_ENABLE_AUTONOMOUS_AGENT === 'true';

if (!TYAPROVER_API_URL || !TYAPROVER_AUTH_TOKEN) {
    console.error("FATAL: TYAPROVER_API_URL and TYAPROVER_AUTH_TOKEN environment variables are required.");
    process.exit(1);
}

const server = new McpServer({
    name: "tyaprover",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});

// Initialize Background Agent if enabled
if (ENABLE_AUTONOMOUS_AGENT) {
    const agent = new BackgroundAgent(TYAPROVER_API_URL, TYAPROVER_AUTH_TOKEN, TYAPROVER_NAMESPACE);
    agent.start();
}

// Export server for testing purposes
export { server };

// --- Helpers ---

// Helper function to make API calls to Tyaprover
async function callTyaproverApi(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${TYAPROVER_API_URL}/api/${CAPROVER_API_VERSION}/${TYAPROVER_NAMESPACE}${endpoint}`;
    const headers: any = {
        'x-captain-auth': TYAPROVER_AUTH_TOKEN
    };
    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : undefined
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                return { status: response.status, description: text };
            }
            return text;
        }
    } catch (error: any) {
        console.error(`API Call failed: ${method} ${url}`, error);
        throw new Error(`Tyaprover API request failed with status ${error.status || 'unknown'}: ${error.message}`);
    }
}

// Helper to validate and sanitize app names
function validateAndSanitizeAppName(appName: string): string {
    if (!appName) {
        throw new Error("App name is required.");
    }
    const sanitized = appName.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!sanitized) {
        throw new Error(`Invalid app name '${appName}'. App names must contain alphanumeric characters.`);
    }
    if (sanitized.length > 50) {
         throw new Error(`App name '${appName}' is too long. Max 50 characters.`);
    }
    return sanitized;
}

// --- Main function to run the server ---
export async function main() {
    // Register all tools dynamically
    await registerAllTools(server, callTyaproverApi, validateAndSanitizeAppName);

    const transport = new StdioServerTransport();
    try {
        await server.connect(transport);
        console.error("Tyaprover MCP Server running on stdio. Ready to receive tool calls.");
    } catch (error) {
        console.error("Fatal error connecting MCP server:", error);
        process.exit(1);
    }
}

// Ensure main only runs when this script is the main module
import { fileURLToPath } from 'url';
import path from 'path';

const currentFilePath = fileURLToPath(import.meta.url);
const scriptPath = path.resolve(process.argv[1]);

if (currentFilePath === scriptPath) {
    main().catch((error) => {
        console.error("Fatal error in main:", error);
        process.exit(1);
    });
}
