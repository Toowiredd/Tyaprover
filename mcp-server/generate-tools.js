// Script to generate all 59 MCP tool files from existing index.ts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tool definitions with their categories
const tools = {
    system: [
        'getSystemStatus', 'listNodes', 'addDockerNode', 'createBackup',
        'getRootDomain', 'updateRootDomain', 'getNetDataInfo', 'cleanupUnusedImages',
        'enableNetData', 'disableNetData', 'getNginxConfig', 'setNginxConfig',
        'getDiskCleanup', 'cleanupDisk', 'updateCaptainVersion'
    ],
    security: [
        'enableRootSSL', 'forceSSL', 'changePassword', 'get2FAStatus',
        'enable2FA', 'disable2FA', 'verify2FA'
    ],
    apps: [
        'listApps', 'registerApp', 'getAppDetails', 'deployApp', 'deleteApp',
        'renameApp', 'setAppEnvironmentVariables', 'scaleApp', 'restartApp',
        'getAppLogs', 'getAppBuildLogs', 'diagnoseApp', 'enableAppSsl',
        'removeCustomDomain', 'enableAppWebhookBuild', 'deployDatabase',
        'configureGitRepo'
    ],
    registry: [
        'listRegistries', 'addRegistry', 'updateRegistry', 'deleteRegistry',
        'setDefaultPushRegistry'
    ],
    oneclick: [
        'listOneClickApps', 'getOneClickAppInfo', 'deployOneClickApp'
    ],
    themes: [
        'setTheme', 'getTheme', 'deleteTheme', 'getAvailableThemes'
    ],
    projects: [
        'listProjects', 'createProject', 'updateProject', 'deleteProject'
    ],
    pro: [
        'enablePro', 'disablePro'
    ]
};

// Read the current index.ts to extract tool implementations
const indexPath = path.join(__dirname, 'src', 'index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

// Extract tool implementations
function extractToolImplementation(toolName) {
    const regex = new RegExp(
        `server\\.tool\\(\\s*"${toolName}"[\\s\\S]*?\\n\\);`,
        'm'
    );
    const match = indexContent.match(regex);
    return match ? match[0] : null;
}

// Generate individual tool files
Object.entries(tools).forEach(([category, toolNames]) => {
    const categoryPath = path.join(__dirname, 'src', 'tools', category);

    toolNames.forEach(toolName => {
        const implementation = extractToolImplementation(toolName);

        if (!implementation) {
            console.log(`Warning: Could not find implementation for ${toolName}`);
            return;
        }

        // Convert server.tool() to export const register
        const toolContent = `import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    ${implementation}
};
`;

        const filePath = path.join(categoryPath, `${toolName}.ts`);
        fs.writeFileSync(filePath, toolContent);
        console.log(`✓ Created ${category}/${toolName}.ts`);
    });
});

console.log('\\n✓ All tool files generated successfully!');
