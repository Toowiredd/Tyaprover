// Shared types for all MCP tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface TyaproverApiResponse {
    status: number;
    description?: string;
    data?: any;
}

export type CallTyaproverApi = (method: string, endpoint: string, payload?: any) => Promise<TyaproverApiResponse>;

export type ToolRegistrar = (server: McpServer, callTyaproverApi: CallTyaproverApi, validateAndSanitizeAppName?: (name: string) => string) => void;

export interface ToolDefinition {
    name: string;
    category: string;
    register: ToolRegistrar;
}
