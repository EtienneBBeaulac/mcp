import { WorkflowLookupServer } from '../../types/server';
import { JSONRPCResponse, JSONRPCError } from '../../types/mcp-types';
import { JSONRPCServer } from 'json-rpc-2.0';
import { ErrorHandler } from '../../core/error-handler';
import { requestValidator } from '../../validation/request-validator';
import { WorkflowService } from '../../application/services/workflow-service';
import { listWorkflows } from '../../application/use-cases/list-workflows';
import { getNextStep as getNextWorkflowStep } from '../../application/use-cases/get-next-step';
import { validateStepOutput as validateWorkflowStepOutput } from '../../application/use-cases/validate-step-output';
import { getWorkflow } from '../../application/use-cases/get-workflow';

export function createWorkflowLookupServer(
  workflowService: WorkflowService
): WorkflowLookupServer {
  let rpcServer: JSONRPCServer | null = null;
  let running = false;
  let stdinListener: ((chunk: Buffer) => void) | null = null;

  const wrapRpcMethod = <T extends any, R>(methodName: string, fn: (params: T) => Promise<R> | R) => {
    return async (params: T): Promise<R> => {
      try {
        // Validate params against schema before executing business logic
        requestValidator.validate(methodName, params);
        return await fn(params);
      } catch (err) {
        handleError(methodName, err);
        throw toJsonRpcError(err);
      }
    };
  };

  return {
    start: async () => {
      if (running) return;
      console.log('Initializing Workflow Lookup MCP Server...');
      rpcServer = new JSONRPCServer();

      // Register handlers for each tool using injected service layer and
      // delegating to stateless tool handler functions.

      rpcServer.addMethod(
        'workflow_list',
        wrapRpcMethod('workflow_list', async (_params: any) => {
          const workflows = await listWorkflows(workflowService);
          return { workflows };
        })
      );

      rpcServer.addMethod(
        'workflow_get',
        wrapRpcMethod('workflow_get', async (params: any) => {
          return getWorkflow(workflowService, params.id);
        })
      );

      rpcServer.addMethod(
        'workflow_next',
        wrapRpcMethod('workflow_next', async (params: any) => {
          return getNextWorkflowStep(
            workflowService,
            params.workflowId,
            params.completedSteps || []
          );
        })
      );

      rpcServer.addMethod(
        'workflow_validate',
        wrapRpcMethod('workflow_validate', async (params: any) => {
          return validateWorkflowStepOutput(
            workflowService,
            params.workflowId,
            params.stepId,
            params.output
          );
        })
      );

      // MCP handshake methods
      rpcServer.addMethod('initialize', async (params: any) => {
        try {
          const { initializeHandler } = await import('../../tools/mcp_initialize');
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
          const { toolsListHandler } = await import('../../tools/mcp_tools_list');
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
          const { shutdownHandler } = await import('../../tools/mcp_shutdown');
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