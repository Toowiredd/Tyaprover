import { z } from "zod";
import { ToolRegistrar } from "../types.js";

export const register: ToolRegistrar = (server, callTyaproverApi, validateAndSanitizeAppName) => {
    server.tool(
    "getSystemStatus",
    "Retrieves system status, version information, and load balancer info.",
    {},
    async () => {
        try {
            const [infoRes, versionRes, loadBalancerRes] = await Promise.all([
                callTyaproverApi('GET', '/system/info/'),
                callTyaproverApi('GET', '/system/versionInfo/'),
                callTyaproverApi('GET', '/system/loadbalancerinfo/')
            ]);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        info: infoRes?.data || infoRes,
                        version: versionRes?.data || versionRes,
                        loadBalancer: loadBalancerRes?.data || loadBalancerRes
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error fetching system status: ${error.message}` }] };
        }
    }
);
};
