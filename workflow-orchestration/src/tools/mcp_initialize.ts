import { MCPInitializeRequest, MCPInitializeResponse } from '../types/mcp-types';

export async function initializeHandler(
  request: MCPInitializeRequest
): Promise<MCPInitializeResponse> {
  const protocolVersion = request.params?.protocolVersion ?? '2024-11-05';

  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: true,
          notifyProgress: false
        },
        resources: {
          listChanged: false
        }
      },
      serverInfo: {
        name: 'workflow-lookup',
        version: '1.0.0',
        description: 'MCP server for workflow orchestration and guidance'
      }
    }
  };
} 