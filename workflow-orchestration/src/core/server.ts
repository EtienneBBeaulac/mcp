import { WorkflowLookupServer } from '../types/server';
import { JSONRPCResponse, JSONRPCError } from '../types/mcp-types';
import { JSONRPCServer } from 'json-rpc-2.0';
import { workflowListHandler } from '../tools/workflow_list';
import { workflowGetHandler } from '../tools/workflow_get';
import { workflowNextHandler } from '../tools/workflow_next';
import { workflowValidateHandler } from '../tools/workflow_validate';
import { ErrorHandler } from '../core/error-handler';

export function createWorkflowLookupServer(): WorkflowLookupServer {
  let rpcServer: JSONRPCServer | null = null;
  let running = false;
  let stdinListener: ((chunk: Buffer) => void) | null = null;

  return {
    start: async () => {
      if (running) return;
      console.log('Initializing Workflow Lookup MCP Server...');
      rpcServer = new JSONRPCServer();

      // Register handlers for each tool
      rpcServer.addMethod('workflow_list', async (params: any) => {
        try {
          return (await workflowListHandler({ id: 0, params, method: 'workflow_list' } as any)).result;
        } catch (err) {
          handleError('workflow_list', err);
          throw toJsonRpcError(err);
        }
      });
      rpcServer.addMethod('workflow_get', async (params: any) => {
        try {
          return (await workflowGetHandler({ id: 0, params, method: 'workflow_get' } as any)).result;
        } catch (err) {
          handleError('workflow_get', err);
          throw toJsonRpcError(err);
        }
      });
      rpcServer.addMethod('workflow_next', async (params: any) => {
        try {
          return (await workflowNextHandler({ id: 0, params, method: 'workflow_next' } as any)).result;
        } catch (err) {
          handleError('workflow_next', err);
          throw toJsonRpcError(err);
        }
      });
      rpcServer.addMethod('workflow_validate', async (params: any) => {
        try {
          return (await workflowValidateHandler({ id: 0, params, method: 'workflow_validate' } as any)).result;
        } catch (err) {
          handleError('workflow_validate', err);
          throw toJsonRpcError(err);
        }
      });

      // MCP handshake methods
      rpcServer.addMethod('initialize', async (params: any) => {
        try {
          const { initializeHandler } = await import('../tools/mcp_initialize');
          return (
            await initializeHandler({ id: 0, params, method: 'initialize', jsonrpc: '2.0' } as any)
          ).result;
        } catch (err) {
          handleError('initialize', err);
          throw toJsonRpcError(err);
        }
      });

      rpcServer.addMethod('tools/list', async (params: any) => {
        try {
          const { toolsListHandler } = await import('../tools/mcp_tools_list');
          return (
            await toolsListHandler({ id: 0, params, method: 'tools/list', jsonrpc: '2.0' } as any)
          ).result;
        } catch (err) {
          handleError('tools/list', err);
          throw toJsonRpcError(err);
        }
      });

      rpcServer.addMethod('shutdown', async (params: any) => {
        try {
          const { shutdownHandler } = await import('../tools/mcp_shutdown');
          return (
            await shutdownHandler({ id: 0, params, method: 'shutdown', jsonrpc: '2.0' } as any)
          ).result;
        } catch (err) {
          handleError('shutdown', err);
          throw toJsonRpcError(err);
        }
      });

      // Listen on stdin/stdout (MCP default)
      let stdinBuffer = '';
      stdinListener = async (chunk: Buffer) => {
        stdinBuffer += chunk.toString();

        // Process each complete line (newline-delimited JSON-RPC message)
        let newlineIndex: number;
        while ((newlineIndex = stdinBuffer.indexOf('\n')) !== -1) {
          const raw = stdinBuffer.slice(0, newlineIndex).trim();
          stdinBuffer = stdinBuffer.slice(newlineIndex + 1);

          if (raw.length === 0) continue; // skip empty lines

          try {
            const request = JSON.parse(raw);
            const response = await rpcServer!.receive(request);
            if (response) {
              process.stdout.write(JSON.stringify(response) + '\n');
            }
          } catch (err) {
            handleError('stdin', err);
            const errorResponse: JSONRPCResponse = {
              jsonrpc: '2.0',
              id: null,
              error: toJsonRpcError(err)
            };
            process.stdout.write(JSON.stringify(errorResponse) + '\n');
          }
        }
      };
      if (process.env['NODE_ENV'] !== 'test') {
        process.stdin.on('data', stdinListener);
      }
      running = true;
      console.log('Server ready to accept JSON-RPC requests');
    },
    stop: async () => {
      if (!running) {
        console.log('Shutdown requested, but server is not running.');
        return;
      }
      console.log('Shutting down Workflow Lookup MCP Server...');
      if (stdinListener) {
        process.stdin.off('data', stdinListener);
        stdinListener = null;
      }
      running = false;
      console.log('Server stopped');
    }
  };
}

function handleError(context: string, err: any) {
  // Delegate to centralized error handler for logging
  ErrorHandler.getInstance().handleError(err, null);
  if (process.env['NODE_ENV'] !== 'test') {
    console.error(`[${context}] Error:`, err);
  }
}
function toJsonRpcError(err: any): JSONRPCError {
  // Convert any error to MCP-compliant JSONRPCError via ErrorHandler
  const errorResponse = ErrorHandler.getInstance().handleError(err, null);
  return errorResponse.error as JSONRPCError;
} 