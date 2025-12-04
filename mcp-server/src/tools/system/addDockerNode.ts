import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "addDockerNode",
    "Adds a new Docker Swarm node to the cluster.",
    {
        nodeType: z.enum(["manager", "worker"]).describe("Type of node to add"),
        privateKey: z.string().describe("SSH private key for authentication"),
        remoteNodeIpAddress: z.string().describe("IP address of the remote node"),
        sshPort: z.number().optional().describe("SSH port (default: 22)"),
        sshUser: z.string().optional().describe("SSH username (default: root)"),
    },
    async (input) => {
        try {
            const payload = {
                isManager: input.nodeType === "manager",
                privateKey: input.privateKey,
                remoteNodeIpAddress: input.remoteNodeIpAddress,
                sshPort: input.sshPort || 22,
                sshUser: input.sshUser || "root",
            };
            const response = await callTyaproverApi('POST', '/system/nodes/addnode/', payload);

            if (response && response.status === 100) {
                return { content: [{ type: "text", text: `Node ${input.remoteNodeIpAddress} added successfully as ${input.nodeType}.` }] };
            }
            return { content: [{ type: "text", text: `Failed to add node: ${response?.description}` }] };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);
};
