// Tool Registry - Automatically discovers and loads all tool modules

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallTyaproverApi } from "./types.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Recursively discovers all .ts/.js tool files in the tools directory
 */
function discoverTools(baseDir: string, currentPath: string = ''): string[] {
    const fullPath = join(baseDir, currentPath);
    const entries = readdirSync(fullPath);
    const tools: string[] = [];

    for (const entry of entries) {
        const entryPath = join(currentPath, entry);
        const fullEntryPath = join(fullPath, entry);
        const stat = statSync(fullEntryPath);

        if (stat.isDirectory() && entry !== '__tests__') {
            // Recursively search subdirectories
            tools.push(...discoverTools(baseDir, entryPath));
        } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.js')) &&
                   entry !== 'types.ts' && entry !== 'types.js' &&
                   entry !== 'registry.ts' && entry !== 'registry.js') {
            tools.push(entryPath.replace(/\.(ts|js)$/, ''));
        }
    }

    return tools;
}

/**
 * Dynamically loads and registers all MCP tools
 */
export async function registerAllTools(
    server: McpServer,
    callTyaproverApi: CallTyaproverApi,
    validateAndSanitizeAppName: (name: string) => string
): Promise<void> {
    const toolsDir = __dirname;
    const toolPaths = discoverTools(toolsDir);

    let registered = 0;
    let failed = 0;

    for (const toolPath of toolPaths) {
        try {
            const modulePath = `./${toolPath}.js`;
            const toolModule = await import(modulePath);

            if (typeof toolModule.register === 'function') {
                toolModule.register(server, callTyaproverApi, validateAndSanitizeAppName);
                registered++;
            } else {
                console.error(`Warning: ${toolPath} does not export a register function`);
                failed++;
            }
        } catch (error: any) {
            console.error(`Failed to load tool ${toolPath}:`, error.message);
            failed++;
        }
    }

    console.error(`✓ Tool Registry: ${registered} tools registered, ${failed} failed`);
}

/**
 * Gets a manifest of all available tools (for debugging/documentation)
 */
export function getToolManifest(): { category: string; tools: string[] }[] {
    const toolsDir = __dirname;
    const manifest: { category: string; tools: string[] }[] = [];

    const categories = readdirSync(toolsDir).filter(entry => {
        const fullPath = join(toolsDir, entry);
        return statSync(fullPath).isDirectory() && entry !== '__tests__';
    });

    for (const category of categories) {
        const categoryPath = join(toolsDir, category);
        const tools = readdirSync(categoryPath)
            .filter(file => (file.endsWith('.ts') || file.endsWith('.js')))
            .map(file => file.replace(/\.(ts|js)$/, ''));

        manifest.push({ category, tools });
    }

    return manifest;
}
