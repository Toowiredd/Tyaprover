import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "enablePro",
    "Enables CapRover Pro features (requires valid license).",
    {
        licenseKey: z.string().describe("Pro license key"),
    },
    async ({ licenseKey }) => {
        try {
            const payload = { licenseKey };
            const response = await callTyaproverApi('POST', '/user/pro/enable/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: "CapRover Pro features enabled successfully." }] };
            }
            return { content: [{ type: "text", text: `Failed to enable Pro features: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
