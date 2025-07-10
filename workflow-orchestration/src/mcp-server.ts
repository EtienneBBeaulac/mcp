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
          result = await workflowService.getNextStep(params.workflowId, params.completedSteps || []);
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

  public async getWorkflow(workflowId: string): Promise<CallToolResult> {
    return this.callWorkflowMethod('workflow_get', { id: workflowId });
  }

  public async getNextStep(workflowId: string, completedSteps: string[] = []): Promise<CallToolResult> {
    return this.callWorkflowMethod('workflow_next', { workflowId, completedSteps });
  }

  public async validateStep(workflowId: string, stepId: string, output: string): Promise<CallToolResult> {
    return this.callWorkflowMethod('workflow_validate', { workflowId, stepId, output });
  }
}

// Define the workflow orchestration tools
const WORKFLOW_LIST_TOOL: Tool = {
  name: "workflow_list",
  description: `List all available workflows in the system.
  
  Returns a comprehensive list of workflow definitions that can be used to guide structured task completion. Each workflow includes metadata like name, description, and step count.
  
  Use this tool to:
  - Discover available workflows for different types of tasks
  - Get an overview of workflow options before starting a task
  - Browse workflow catalogs for specific domains (auth, API development, etc.)`,
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false
  }
};

const WORKFLOW_GET_TOOL: Tool = {
  name: "workflow_get",
  description: `Get detailed information about a specific workflow.
  
  Retrieves the complete workflow definition including all steps, preconditions, guidance, and metadata. This provides the full blueprint for executing a structured task.
  
  Use this tool to:
  - Get the complete step-by-step instructions for a workflow
  - Understand preconditions and requirements before starting
  - Review clarification prompts and meta-guidance
  - Plan the execution of a complex task`,
  inputSchema: {
    type: "object",
    properties: {
      workflowId: {
        type: "string",
        description: "The unique identifier of the workflow to retrieve",
        pattern: "^[A-Za-z0-9_-]+$"
      }
    },
    required: ["workflowId"],
    additionalProperties: false
  }
};

const WORKFLOW_NEXT_TOOL: Tool = {
  name: "workflow_next",
  description: `Get the next step in a workflow progression.
  
  Determines what step should be executed next based on the workflow definition and currently completed steps. Provides intelligent step sequencing and completion detection.
  
  Use this tool to:
  - Get the next actionable step in a workflow
  - Understand step dependencies and prerequisites  
  - Determine if a workflow is complete
  - Receive contextual guidance for the current stage`,
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
      }
    },
    required: ["workflowId"],
    additionalProperties: false
  }
};

const WORKFLOW_VALIDATE_TOOL: Tool = {
  name: "workflow_validate",
  description: `Validate the completion of a workflow step.
  
  Checks if a step has been properly completed based on the step requirements and provided output. Provides feedback and validation results to ensure quality execution.
  
  Use this tool to:
  - Verify that a step meets its completion criteria
  - Get feedback on step output quality
  - Ensure proper progression through workflow steps
  - Validate deliverables before moving to next step`,
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

// Create and configure the MCP server
const server = new Server(
  {
    name: "workflow-orchestration-server",
    version: "1.2.0",
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
    WORKFLOW_VALIDATE_TOOL
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
      return await workflowServer.getWorkflow(args['workflowId'] as string);
      
    case "workflow_next":
      if (!args?.['workflowId']) {
        return {
          content: [{ type: "text", text: "Error: workflowId parameter is required" }],
          isError: true
        };
      }
      return await workflowServer.getNextStep(args['workflowId'] as string, args['completedSteps'] as string[] || []);
      
    case "workflow_validate":
      if (!args?.['workflowId'] || !args?.['stepId'] || !args?.['output']) {
        return {
          content: [{ type: "text", text: "Error: workflowId, stepId, and output parameters are required" }],
          isError: true
        };
      }
      return await workflowServer.validateStep(args['workflowId'] as string, args['stepId'] as string, args['output'] as string);
      
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