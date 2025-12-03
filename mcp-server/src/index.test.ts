
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Define mockTool outside so we can track calls
const mockTool = jest.fn();

// We need to use unstable_mockModule for ESM mocking in Jest
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

describe("MCP Server Tools", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockTool.mockClear();
    });

    test("should register expected tools", async () => {
        // Import the module dynamically AFTER setting up mocks
        await import("./index.js");

        const registeredTools = mockTool.mock.calls.map(call => call[0]);
        console.log("Registered Tools:", registeredTools);

        expect(registeredTools).toContain("listApps");
        expect(registeredTools).toContain("getAppDetails");
        expect(registeredTools).toContain("deployApp");
        expect(registeredTools).toContain("deleteApp");
        expect(registeredTools).toContain("setAppEnvironmentVariables");
        expect(registeredTools).toContain("scaleApp");
        expect(registeredTools).toContain("enableAppSsl");
        expect(registeredTools).toContain("removeCustomDomain");
        expect(registeredTools).toContain("deployDatabase");
        expect(registeredTools).toContain("configureGitRepo");
        expect(registeredTools).toContain("getAppLogs");
        expect(registeredTools).toContain("diagnoseApp");
    });
});
