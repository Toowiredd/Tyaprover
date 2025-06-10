// mcp-server/src/__tests__/index.test.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// We need to access the tool registration, so we'll need to refactor index.ts slightly
// to export the server instance or the tool registration functions if they are not directly accessible.
// For now, let's assume we can import the server and trigger tools.
// This will likely require a refactor of mcp-server/src/index.ts to export `server` for testing.

// Mock node-fetch
// Top-level variable to store the mock implementation
let mockFetch: jest.Mock;

jest.mock('node-fetch', () => {
    mockFetch = jest.fn();
    // The default export of node-fetch is the fetch function itself.
    // So, we return the mock directly.
    return mockFetch;
});

// Dynamically import the server setup after mocks are in place.
// This requires index.ts to be importable and ideally not autorun main().
// We will assume index.ts is refactored to export its server instance or tool functions.
// For this subtask, we'll write test logic assuming `server` can be imported and its tools tested.
// The actual refactor of index.ts to make `server` testable is implied.

describe('Tyaprover MCP Server Tools', () => {
    let serverInstance: McpServer;

    beforeEach(async () => {
        // Reset environment variables for each test if necessary
        process.env.TYAPROVER_API_URL = 'http://fake-caprover.com';
        process.env.TYAPROVER_AUTH_TOKEN = 'test-token';
        process.env.TYAPROVER_NAMESPACE = 'test-captain';
        process.env.CAPROVER_API_VERSION = 'v2';

        // Dynamically import the server from index.ts
        // This assumes index.ts is refactored to export the server for testing purposes
        // and that its main() function doesn't autorun on import.
        const mcpModule = await import('../index.js');
        serverInstance = mcpModule.server; // Assuming server is exported as 'server'
        mockFetch.mockClear();
    });

    describe('listApps', () => {
        it('should return apps list on successful API call', async () => {
            const mockAppData = {
                status: 100,
                description: 'Success',
                data: { appDefinitions: [{ appName: 'app1' }, { appName: 'app2' }] }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockAppData,
                headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('listApps');
            if (!tool) throw new Error('listApps tool not found');

            const result = await tool.handler({});
            expect(mockFetch).toHaveBeenCalledWith(
                'http://fake-caprover.com/api/v2/user/apps',
                expect.objectContaining({ method: 'GET' })
            );
            expect(result.content[0].type).toBe('json_object');
            expect((result.content[0] as any).json_object).toEqual([{ appName: 'app1' }, { appName: 'app2' }]);
        });

        it('should return error message on API failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error'
            });
             const tool = serverInstance.getTool('listApps');
             if (!tool) throw new Error('listApps tool not found');

            const result = await tool.handler({});
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toContain('Error listing apps: Tyaprover API request failed with status 500');
        });
    });

    describe('getAppDetails', () => {
        const appName = 'app1';
        it('should return app details if app exists', async () => {
            const mockAppData = {
                status: 100,
                description: 'Success',
                data: { appDefinitions: [{ appName: 'app1', data: 'details1' }, { appName: 'app2' }] }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockAppData,
                headers: new Map([['content-type', 'application/json']])
            });
             const tool = serverInstance.getTool('getAppDetails');
             if (!tool) throw new Error('getAppDetails tool not found');

            const result = await tool.handler({ appName });
            expect(result.content[0].type).toBe('json_object');
            expect((result.content[0] as any).json_object).toEqual({ appName: 'app1', data: 'details1' });
        });

        it('should return error if app not found', async () => {
             const mockAppData = {
                status: 100,
                description: 'Success',
                data: { appDefinitions: [{ appName: 'app2' }] }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockAppData,
                headers: new Map([['content-type', 'application/json']])
            });
             const tool = serverInstance.getTool('getAppDetails');
             if (!tool) throw new Error('getAppDetails tool not found');

            const result = await tool.handler({ appName: 'nonexistentapp' });
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe("Error: App 'nonexistentapp' not found.");
        });
    });

    describe('deployNewApp', () => {
        const deployInput = {
            appName: 'newApp',
            imageName: 'nginx:latest',
            instanceCount: 1
        };
        it('should call deploy API and return success message', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ status: 100, description: 'App deployed' }), // Mock CapRover's success response
                headers: new Map([['content-type', 'application/json']])
            });

             const tool = serverInstance.getTool('deployNewApp');
             if (!tool) throw new Error('deployNewApp tool not found');

            const result = await tool.handler(deployInput);
            expect(mockFetch).toHaveBeenCalledWith(
                `http://fake-caprover.com/api/v2/user/apps/appdefinitions/${deployInput.appName}`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ // Ensure only defined fields from input are sent
                        appName: deployInput.appName,
                        imageName: deployInput.imageName,
                        instanceCount: deployInput.instanceCount,
                        hasPersistentData: false, // Default from current tool logic
                        notExposeAsWebApp: false,
                        forceSsl: false
                    })
                })
            );
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`Application '${deployInput.appName}' deployment/update initiated successfully.`);
        });

         it('should handle API error during deployment', async () => {
             mockFetch.mockResolvedValueOnce({
                 ok: false,
                 status: 400,
                 text: async () => 'Invalid app name'
             });
             const tool = serverInstance.getTool('deployNewApp');
             if (!tool) throw new Error('deployNewApp tool not found');

             const result = await tool.handler(deployInput);
             expect(result.content[0].type).toBe('text');
             expect((result.content[0] as any).text).toContain(`Error deploying app '${deployInput.appName}': Tyaprover API request failed with status 400: Invalid app name`);
         });
    });
});

// Placeholder for refactor needed in mcp-server/src/index.ts:
// The `server` instance and potentially `callTyaproverApi` need to be exported.
// The main() function should not auto-run when the module is imported for testing.
// Example refactor sketch for mcp-server/src/index.ts:
/*
// ... imports ...
export const server = new McpServer(...); // Exported
// ... tool definitions using server.tool(...) ...

// export async function callTyaproverApi(...) { ... } // If needed to test separately

export async function main() { // Exported, not auto-run
    const transport = new StdioServerTransport();
    // ... connect logic ...
}

// Only run main if this script is executed directly
if (import.meta.url === \`file://\${process.argv[1]}\`) { // Or a similar check for direct execution
    main().catch(...);
}
*/
