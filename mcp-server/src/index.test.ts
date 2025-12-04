import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Define mockTool outside so we can track calls
const mockTool = jest.fn();

// Mock the MCP SDK
jest.unstable_mockModule("@modelcontextprotocol/sdk/server/mcp.js", () => {
    return {
        McpServer: jest.fn().mockImplementation(() => {
            return {
                tool: mockTool,
                connect: jest.fn()
            };
        })
    };
});

jest.unstable_mockModule("@modelcontextprotocol/sdk/server/stdio.js", () => {
    return {
        StdioServerTransport: jest.fn()
    };
});

jest.unstable_mockModule("node-fetch", () => ({
    __esModule: true,
    default: jest.fn()
}));

describe("MCP Server Tools - Modular Structure", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTool.mockClear();
    });

    test("should register all 59 tools from modular structure", async () => {
        // Import the module dynamically AFTER setting up mocks
        await import("./index.js");

        const registeredTools = mockTool.mock.calls.map(call => call[0]);
        console.log(`Registered ${registeredTools.length} tools from modular structure`);

        // Verify total count
        expect(registeredTools.length).toBe(59);

        // System Management (15 tools)
        expect(registeredTools).toContain("getSystemStatus");
        expect(registeredTools).toContain("listNodes");
        expect(registeredTools).toContain("addDockerNode");
        expect(registeredTools).toContain("createBackup");
        expect(registeredTools).toContain("getRootDomain");
        expect(registeredTools).toContain("updateRootDomain");
        expect(registeredTools).toContain("getNetDataInfo");
        expect(registeredTools).toContain("cleanupUnusedImages");
        expect(registeredTools).toContain("enableNetData");
        expect(registeredTools).toContain("disableNetData");
        expect(registeredTools).toContain("getNginxConfig");
        expect(registeredTools).toContain("setNginxConfig");
        expect(registeredTools).toContain("getDiskCleanup");
        expect(registeredTools).toContain("cleanupDisk");
        expect(registeredTools).toContain("updateCaptainVersion");

        // Security & SSL (7 tools)
        expect(registeredTools).toContain("enableRootSSL");
        expect(registeredTools).toContain("forceSSL");
        expect(registeredTools).toContain("changePassword");
        expect(registeredTools).toContain("get2FAStatus");
        expect(registeredTools).toContain("enable2FA");
        expect(registeredTools).toContain("disable2FA");
        expect(registeredTools).toContain("verify2FA");

        // Application Management (17 tools)
        expect(registeredTools).toContain("listApps");
        expect(registeredTools).toContain("registerApp");
        expect(registeredTools).toContain("getAppDetails");
        expect(registeredTools).toContain("deployApp");
        expect(registeredTools).toContain("deleteApp");
        expect(registeredTools).toContain("renameApp");
        expect(registeredTools).toContain("setAppEnvironmentVariables");
        expect(registeredTools).toContain("scaleApp");
        expect(registeredTools).toContain("restartApp");
        expect(registeredTools).toContain("getAppLogs");
        expect(registeredTools).toContain("getAppBuildLogs");
        expect(registeredTools).toContain("diagnoseApp");
        expect(registeredTools).toContain("enableAppSsl");
        expect(registeredTools).toContain("removeCustomDomain");
        expect(registeredTools).toContain("enableAppWebhookBuild");
        expect(registeredTools).toContain("deployDatabase");
        expect(registeredTools).toContain("configureGitRepo");

        // Docker Registry (5 tools)
        expect(registeredTools).toContain("listRegistries");
        expect(registeredTools).toContain("addRegistry");
        expect(registeredTools).toContain("updateRegistry");
        expect(registeredTools).toContain("deleteRegistry");
        expect(registeredTools).toContain("setDefaultPushRegistry");

        // One-Click Apps (3 tools)
        expect(registeredTools).toContain("listOneClickApps");
        expect(registeredTools).toContain("getOneClickAppInfo");
        expect(registeredTools).toContain("deployOneClickApp");

        // Themes (4 tools)
        expect(registeredTools).toContain("setTheme");
        expect(registeredTools).toContain("getTheme");
        expect(registeredTools).toContain("deleteTheme");
        expect(registeredTools).toContain("getAvailableThemes");

        // Projects (4 tools)
        expect(registeredTools).toContain("listProjects");
        expect(registeredTools).toContain("createProject");
        expect(registeredTools).toContain("updateProject");
        expect(registeredTools).toContain("deleteProject");

        // Pro Features (2 tools)
        expect(registeredTools).toContain("enablePro");
        expect(registeredTools).toContain("disablePro");
    });
});
