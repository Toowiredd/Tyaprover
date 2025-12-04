import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "listNodes",
    "Lists the nodes in the Docker Swarm cluster.",
    {},
    async () => {
        try {
            const response = await callTyaproverApi('GET', '/system/nodes/');
            if (response && response.status === 100 && response.data && response.data.nodes) {
                return { content: [{ type: "text", text: JSON.stringify(response.data.nodes, null, 2) }] };
            }
             return { content: [{ type: "text", text: `Error listing nodes: ${response?.description || JSON.stringify(response)}` }] };
        } catch (error: any) {
             return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
