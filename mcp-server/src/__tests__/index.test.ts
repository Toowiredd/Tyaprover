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

    describe('deleteApp', () => {
        const appName = 'app-to-delete';

        it('should call delete API and return success message on successful deletion', async () => {
            const mockSuccessResponse = {
                status: 100, // CapRover's BaseApi success
                description: 'App deleted successfully.'
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessResponse,
                headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('deleteApp');
            if (!tool) throw new Error('deleteApp tool not found');

            const result = await tool.handler({ appName });

            expect(mockFetch).toHaveBeenCalledWith(
                `http://fake-caprover.com/api/v2/user/apps/appdefinitions/${appName}`,
                expect.objectContaining({ method: 'DELETE' })
            );
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`Application '${appName}' deleted successfully. Description: App deleted successfully.`);
        });

        it('should return an error message if API call fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404, // e.g., App not found
                text: async () => 'App not found on server',
                // CapRover might return JSON BaseApi error or plain text for some errors
                // Here simulating a non-JSON text error for variety
                headers: new Map([['content-type', 'text/plain']])
            });
             const tool = serverInstance.getTool('deleteApp');
             if (!tool) throw new Error('deleteApp tool not found');

            const result = await tool.handler({ appName });

            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toContain(`Error deleting application '${appName}': Tyaprover API request failed with status 404: App not found on server`);
        });

        it('should handle unexpected non-BaseApi JSON error structure from API', async () => {
             const mockErrorResponse = { // Not a BaseApi structure
                 error: "some_error_code",
                 message: "Something went wrong"
             };
             mockFetch.mockResolvedValueOnce({
                 ok: true, // HTTP call itself was okay
                 status: 200, // but the logical operation failed as per CapRover's non-BaseApi JSON
                 json: async () => mockErrorResponse,
                 headers: new Map([['content-type', 'application/json']])
             });
             const tool = serverInstance.getTool('deleteApp');
             if (!tool) throw new Error('deleteApp tool not found');

             const result = await tool.handler({ appName });
             expect(result.content[0].type).toBe('text');
             // This tests the fallback where response.status is not 100
             expect((result.content[0] as any).text).toContain(`Failed to delete application '${appName}'. Unexpected API response: ${JSON.stringify(mockErrorResponse)}`);
        });

        it('should handle error when callTyaproverApi itself throws (e.g. network issue)', async () => {
             mockFetch.mockRejectedValueOnce(new Error("Network connection refused"));

             const tool = serverInstance.getTool('deleteApp');
             if (!tool) throw new Error('deleteApp tool not found');

             const result = await tool.handler({ appName });
             expect(result.content[0].type).toBe('text');
             expect((result.content[0] as any).text).toContain(`Error deleting application '${appName}': Network connection refused`);
        });
    });

    describe('setAppEnvironmentVariables', () => {
        const appName = 'app-env-test';
        const initialAppDef = {
            appName,
            imageName: 'test-image:latest',
            instanceCount: 1,
            hasPersistentData: false,
            notExposeAsWebApp: false,
            forceSsl: false,
            envVars: [{ key: 'OLD_VAR', value: 'old_value' }]
        };
        const newEnvVars = [{ key: 'NEW_VAR', value: 'new_value' }];

        it('should fetch, update, and post app definition successfully', async () => {
            // Mock GET /apps response
            mockFetch.mockResolvedValueOnce({
                ok: true, status: 200, json: async () => ({
                    status: 100, data: { appDefinitions: [initialAppDef] }
                }), headers: new Map([['content-type', 'application/json']])
            });
            // Mock POST /apps/appdefinitions/:appName response
            mockFetch.mockResolvedValueOnce({
                ok: true, status: 200, json: async () => ({
                    status: 100, description: 'App updated'
                }), headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('setAppEnvironmentVariables');
            if (!tool) throw new Error('setAppEnvironmentVariables tool not found');

            const result = await tool.handler({ appName, environmentVariables: newEnvVars });

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenNthCalledWith(1,
                `http://fake-caprover.com/api/v2/user/apps`,
                expect.objectContaining({ method: 'GET' })
            );
            const expectedPayload = { ...initialAppDef, envVars: newEnvVars };
            expect(mockFetch).toHaveBeenNthCalledWith(2,
                `http://fake-caprover.com/api/v2/user/apps/appdefinitions/${appName}`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(expectedPayload)
                })
            );
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`Environment variables for '${appName}' updated successfully.`);
        });

        it('should return error if app not found during fetch', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true, status: 200, json: async () => ({
                    status: 100, data: { appDefinitions: [{ appName: 'other-app' }] } // appName does not match
                }), headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('setAppEnvironmentVariables');
            if (!tool) throw new Error('setAppEnvironmentVariables tool not found');

            const result = await tool.handler({ appName, environmentVariables: newEnvVars });
            expect(mockFetch).toHaveBeenCalledTimes(1); // Only fetch is called
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`Error: Application '${appName}' not found.`);
        });

        it('should return error if fetch API call fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false, status: 500, text: async () => 'Fetch failed'
            });

            const tool = serverInstance.getTool('setAppEnvironmentVariables');
            if (!tool) throw new Error('setAppEnvironmentVariables tool not found');

            const result = await tool.handler({ appName, environmentVariables: newEnvVars });
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toContain(`Error setting environment variables for '${appName}': Tyaprover API request failed with status 500`);
        });

        it('should return error if update POST API call fails', async () => {
            // Mock GET /apps response (success)
            mockFetch.mockResolvedValueOnce({
                ok: true, status: 200, json: async () => ({
                    status: 100, data: { appDefinitions: [initialAppDef] }
                }), headers: new Map([['content-type', 'application/json']])
            });
            // Mock POST /apps/appdefinitions/:appName response (failure)
            mockFetch.mockResolvedValueOnce({
                ok: false, status: 400, json: async () => ({
                    status: 101, description: 'Invalid update params'
                }), headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('setAppEnvironmentVariables');
            if (!tool) throw new Error('setAppEnvironmentVariables tool not found');

            const result = await tool.handler({ appName, environmentVariables: newEnvVars });
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toContain(`Failed to update environment variables for '${appName}': Invalid update params`);
         });
    });

    describe('scaleApp', () => {
        const appName = 'app-scale-test';
        const initialAppDef = {
            appName,
            imageName: 'test-image:latest',
            instanceCount: 1,
            hasPersistentData: false,
            notExposeAsWebApp: false,
            forceSsl: false,
            envVars: [{ key: 'VAR1', value: 'val1' }],
            ports: [{containerPort: 80, hostPort: 8080}],
            volumes: [{appName: appName, hostPath: 'vol1', containerPath: '/data'}]
        };
        const newInstanceCount = 3;

        it('should fetch, update instance count, and post app definition successfully', async () => {
            // Mock GET /apps response
            mockFetch.mockResolvedValueOnce({
                ok: true, status: 200, json: async () => ({
                    status: 100, data: { appDefinitions: [initialAppDef] }
                }), headers: new Map([['content-type', 'application/json']])
            });
            // Mock POST /apps/appdefinitions/:appName response
            mockFetch.mockResolvedValueOnce({
                ok: true, status: 200, json: async () => ({
                    status: 100, description: 'App updated'
                }), headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('scaleApp');
            if (!tool) throw new Error('scaleApp tool not found');

            const result = await tool.handler({ appName, instanceCount: newInstanceCount });

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenNthCalledWith(1,
                `http://fake-caprover.com/api/v2/user/apps`,
                expect.objectContaining({ method: 'GET' })
            );
            const expectedPayload = { ...initialAppDef, instanceCount: newInstanceCount };
            expect(mockFetch).toHaveBeenNthCalledWith(2,
                `http://fake-caprover.com/api/v2/user/apps/appdefinitions/${appName}`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(expectedPayload)
                })
            );
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`Application '${appName}' scaled to ${newInstanceCount} instance(s) successfully.`);
        });

        it('should return error if app not found during fetch', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true, status: 200, json: async () => ({
                    status: 100, data: { appDefinitions: [{ appName: 'other-app' }] }
                }), headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('scaleApp');
            if (!tool) throw new Error('scaleApp tool not found');

            const result = await tool.handler({ appName, instanceCount: newInstanceCount });
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`Error: Application '${appName}' not found.`);
        });

         it('should handle API error during POST for scaling', async () => {
             mockFetch.mockResolvedValueOnce({ // Successful GET
                 ok: true, status: 200, json: async () => ({
                     status: 100, data: { appDefinitions: [initialAppDef] }
                 }), headers: new Map([['content-type', 'application/json']])
             });
             mockFetch.mockResolvedValueOnce({ // Failed POST
                 ok: false, status: 500, json: async () => ({
                     status: 101, description: 'Scaling failed internally'
                 }), headers: new Map([['content-type', 'application/json']])
             });

             const tool = serverInstance.getTool('scaleApp');
             if (!tool) throw new Error('scaleApp tool not found');

             const result = await tool.handler({ appName, instanceCount: newInstanceCount });
             expect(mockFetch).toHaveBeenCalledTimes(2);
             expect(result.content[0].type).toBe('text');
             expect((result.content[0] as any).text).toContain(`Failed to scale application '${appName}': Scaling failed internally`);
         });
    });

    describe('enableAppSsl', () => {
        const appName = 'app-ssl-test';
        const customDomain = 'test.example.com';

        it('should call enable SSL API and return success message', async () => {
            const mockSuccessResponse = {
                status: 100, // CapRover's BaseApi success
                description: 'Domain attached and SSL being provisioned.'
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessResponse,
                headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('enableAppSsl');
            if (!tool) throw new Error('enableAppSsl tool not found');

            const result = await tool.handler({ appName, customDomain });

            expect(mockFetch).toHaveBeenCalledWith(
                `http://fake-caprover.com/api/v2/user/apps/appdefinitions/${appName}/customdomain`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ customDomain })
                })
            );
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`SSL enablement initiated for '${appName}' with domain '${customDomain}'. ${mockSuccessResponse.description}`);
        });

        it('should return an error message if API call fails (e.g., DNS not ready)', async () => {
            const mockErrorResponse = {
                status: 101, // CapRover's BaseApi error
                description: 'DNS lookup for test.example.com failed.'
            };
            mockFetch.mockResolvedValueOnce({
                ok: true, // HTTP request itself is OK (200), but CapRover returns an error status in JSON
                status: 200,
                json: async () => mockErrorResponse,
                headers: new Map([['content-type', 'application/json']])
            });
             const tool = serverInstance.getTool('enableAppSsl');
             if (!tool) throw new Error('enableAppSsl tool not found');

            const result = await tool.handler({ appName, customDomain });

            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toContain(`Failed to enable SSL for '${appName}' with domain '${customDomain}': ${mockErrorResponse.description}`);
        });

         it('should handle direct HTTP error from API call', async () => {
             mockFetch.mockResolvedValueOnce({
                 ok: false,
                 status: 500,
                 text: async () => 'Internal Server Error during SSL setup',
                 headers: new Map() // No content-type, so callTyaproverApi will use text()
             });
             const tool = serverInstance.getTool('enableAppSsl');
             if (!tool) throw new Error('enableAppSsl tool not found');

             const result = await tool.handler({ appName, customDomain });
             expect(result.content[0].type).toBe('text');
             expect((result.content[0] as any).text).toContain(`Error enabling SSL for '${appName}' with domain '${customDomain}': Tyaprover API request failed with status 500: Internal Server Error during SSL setup`);
         });
    });

    describe('removeCustomDomain', () => {
        const appName = 'app-domain-remove-test';
        const customDomain = 'old.example.com';

        it('should call remove custom domain API and return success message', async () => {
            const mockSuccessResponse = {
                status: 100,
                description: 'Custom domain removed successfully.'
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockSuccessResponse,
                headers: new Map([['content-type', 'application/json']])
            });

            const tool = serverInstance.getTool('removeCustomDomain');
            if (!tool) throw new Error('removeCustomDomain tool not found');

            const result = await tool.handler({ appName, customDomain });

            expect(mockFetch).toHaveBeenCalledWith(
                `http://fake-caprover.com/api/v2/user/apps/appdefinitions/${appName}/customdomain`,
                expect.objectContaining({
                    method: 'DELETE',
                    body: JSON.stringify({ customDomain })
                })
            );
            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toBe(`Custom domain '${customDomain}' removed from '${appName}'. ${mockSuccessResponse.description}`);
        });

        it('should return an error message if API call fails (e.g., domain not found on app)', async () => {
            const mockErrorResponse = {
                status: 101,
                description: 'Custom domain not found for this app.'
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockErrorResponse,
                headers: new Map([['content-type', 'application/json']])
            });
             const tool = serverInstance.getTool('removeCustomDomain');
             if (!tool) throw new Error('removeCustomDomain tool not found');

            const result = await tool.handler({ appName, customDomain });

            expect(result.content[0].type).toBe('text');
            expect((result.content[0] as any).text).toContain(`Failed to remove custom domain '${customDomain}' from '${appName}': ${mockErrorResponse.description}`);
        });

         it('should handle direct HTTP error from API call for remove domain', async () => {
             mockFetch.mockResolvedValueOnce({
                 ok: false,
                 status: 404, // App itself not found, for instance
                 text: async () => 'App not found',
                 headers: new Map()
             });
             const tool = serverInstance.getTool('removeCustomDomain');
             if (!tool) throw new Error('removeCustomDomain tool not found');

             const result = await tool.handler({ appName, customDomain });
             expect(result.content[0].type).toBe('text');
             expect((result.content[0] as any).text).toContain(`Error removing custom domain '${customDomain}' from '${appName}': Tyaprover API request failed with status 404: App not found`);
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
