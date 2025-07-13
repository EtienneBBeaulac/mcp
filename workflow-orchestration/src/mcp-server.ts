#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { createAppContainer } from "./container.js";

class WorkflowOrchestrationServer {
  private container: any;

  constructor() {
    this.container = createAppContainer();
  }

  private async callWorkflowMethod(method: string, params: any): Promise<CallToolResult> {
    try {
      // Use the workflow service directly
      const { workflowService } = this.container;
      
      let result;
      switch (method) {
        case 'workflow_list':
          const workflows = await workflowService.listWorkflowSummaries();
          result = { workflows };
          break;
        case 'workflow_get':
          result = await workflowService.getWorkflowById(params.id);
          break;
        case 'workflow_next':
          result = await workflowService.getNextStep(params.workflowId, params.completedSteps || [], params.context);
          break;
        case 'workflow_validate':
          result = await workflowService.validateStepOutput(params.workflowId, params.stepId, params.output);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Workflow method ${method} failed:`, error);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            method,
            params
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  public async listWorkflows(): Promise<CallToolResult> {
    return this.callWorkflowMethod('workflow_list', {});
  }

  public async getWorkflow(workflowId: string, mode?: string): Promise<CallToolResult> {
    return this.callWorkflowMethod('workflow_get', { id: workflowId, mode });
  }

  public async getNextStep(workflowId: string, completedSteps: string[] = [], context?: any): Promise<CallToolResult> {
    return this.callWorkflowMethod('workflow_next', { workflowId, completedSteps, context });
  }

  public async validateStep(workflowId: string, stepId: string, output: string): Promise<CallToolResult> {
    return this.callWorkflowMethod('workflow_validate', { workflowId, stepId, output });
  }

  public async validateWorkflowJson(workflowJson: string): Promise<CallToolResult> {
    try {
      // Import and use the validation use case
      const { createValidateWorkflowJson } = await import('./application/use-cases/validate-workflow-json.js');
      const validateWorkflowJsonUseCase = createValidateWorkflowJson();
      
      const result = await validateWorkflowJsonUseCase(workflowJson);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Workflow JSON validation failed:`, error);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            method: 'workflow_validate_json',
            workflowJson: workflowJson.substring(0, 100) + (workflowJson.length > 100 ? '...' : '')
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}

// Define the workflow orchestration tools
const WORKFLOW_LIST_TOOL: Tool = {
  name: "workflow_list",
  description: `Your primary tool for any complex or multi-step request. Call this FIRST to see if a reliable, pre-defined workflow exists, as this is the preferred method over improvisation.

  Your process:
  1. Call this tool to get a list of available workflows.
  2. Analyze the returned descriptions to find a match for the user's goal.
  3. If a good match is found, suggest it to the user and use \`workflow_get\` to start.
  4. If NO match is found, inform the user and then attempt to solve the task using your general abilities.`,
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false
  }
};

const WORKFLOW_GET_TOOL: Tool = {
  name: "workflow_get",
  description: `Retrieves workflow information with configurable detail level. Supports progressive disclosure to prevent "workflow spoiling" while providing necessary context for workflow selection and initiation.`,
  inputSchema: {
    type: "object",
    properties: {
      workflowId: {
        type: "string",
        description: "The unique identifier of the workflow to retrieve",
        pattern: "^[A-Za-z0-9_-]+$"
      },
      mode: {
        type: "string",
        enum: ["metadata", "preview"],
        description: "The level of detail to return: 'metadata' returns workflow info without steps, 'preview' (default) returns metadata plus the first eligible step",
        default: "preview"
      }
    },
    required: ["workflowId"],
    additionalProperties: false
  }
};

const WORKFLOW_NEXT_TOOL: Tool = {
  name: "workflow_next",
  description: `Executes a workflow by getting the next step. Use this tool in a loop to progress through a workflow. You must provide the \`workflowId\` and a list of \`completedSteps\`. For conditional workflows, provide \`context\` with variables that will be used to evaluate step conditions.`,
  inputSchema: {
    type: "object",
    properties: {
      workflowId: {
        type: "string",
        description: "The unique identifier of the workflow",
        pattern: "^[A-Za-z0-9_-]+$"
      },
      completedSteps: {
        type: "array",
        items: {
          type: "string",
          pattern: "^[A-Za-z0-9_-]+$"
        },
        description: "Array of step IDs that have been completed",
        default: []
      },
      context: {
        type: "object",
        description: "Optional context variables for conditional step execution",
        additionalProperties: true
      }
    },
    required: ["workflowId"],
    additionalProperties: false
  }
};

const WORKFLOW_VALIDATE_TOOL: Tool = {
  name: "workflow_validate",
  description: `(Optional but Recommended) Verifies the output of a step before proceeding. Use this after completing a step to check if your work is valid to prevent errors.`,
  inputSchema: {
    type: "object",
    properties: {
      workflowId: {
        type: "string",
        description: "The unique identifier of the workflow",
        pattern: "^[A-Za-z0-9_-]+$"
      },
      stepId: {
        type: "string", 
        description: "The unique identifier of the step to validate",
        pattern: "^[A-Za-z0-9_-]+$"
      },
      output: {
        type: "string",
        description: "The output or result produced for this step",
        maxLength: 10000
      }
    },
    required: ["workflowId", "stepId", "output"],
    additionalProperties: false
  }
};

const WORKFLOW_VALIDATE_JSON_TOOL: Tool = {
  name: "workflow_validate_json",
  description: `Validates workflow JSON content directly without external tools. Use this tool when you need to verify that a workflow JSON file is syntactically correct and follows the proper schema.

  This tool provides comprehensive validation including:
  - JSON syntax validation with detailed error messages
  - Workflow schema compliance checking
  - User-friendly error reporting with actionable suggestions
  - Support for all workflow features (steps, conditions, validation criteria, etc.)

  Example usage:
  - Validate a newly created workflow before saving
  - Check workflow syntax when editing workflow files
  - Verify workflow structure when troubleshooting issues
  - Ensure workflow compliance before deployment`,
  inputSchema: {
    type: "object",
    properties: {
      workflowJson: {
        type: "string",
        description: "The complete workflow JSON content as a string to validate",
        minLength: 1
      }
    },
    required: ["workflowJson"],
    additionalProperties: false
  }
};

// Create and configure the MCP server
const server = new Server(
  {
    name: "workflow-orchestration-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const workflowServer = new WorkflowOrchestrationServer();

// Register request handlers
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => ({
  tools: [
    WORKFLOW_LIST_TOOL,
    WORKFLOW_GET_TOOL, 
    WORKFLOW_NEXT_TOOL,
    WORKFLOW_VALIDATE_TOOL,
    WORKFLOW_VALIDATE_JSON_TOOL
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "workflow_list":
      return await workflowServer.listWorkflows();
      
    case "workflow_get":
      if (!args?.['workflowId']) {
        return {
          content: [{ type: "text", text: "Error: workflowId parameter is required" }],
          isError: true
        };
      }
      return await workflowServer.getWorkflow(args['workflowId'] as string, args['mode'] as string);
      
    case "workflow_next":
      if (!args?.['workflowId']) {
        return {
          content: [{ type: "text", text: "Error: workflowId parameter is required" }],
          isError: true
        };
      }
      return await workflowServer.getNextStep(args['workflowId'] as string, args['completedSteps'] as string[] || [], args['context']);
      
    case "workflow_validate":
      if (!args?.['workflowId'] || !args?.['stepId'] || !args?.['output']) {
        return {
          content: [{ type: "text", text: "Error: workflowId, stepId, and output parameters are required" }],
          isError: true
        };
      }
      return await workflowServer.validateStep(args['workflowId'] as string, args['stepId'] as string, args['output'] as string);
      
    case "workflow_validate_json":
      if (!args?.['workflowJson']) {
        return {
          content: [{ type: "text", text: "Error: workflowJson parameter is required" }],
          isError: true
        };
      }
      return await workflowServer.validateWorkflowJson(args['workflowJson'] as string);
      
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true
      };
  }
});

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Workflow Orchestration MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 