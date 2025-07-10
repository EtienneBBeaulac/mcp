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
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  preconditions?: string[];
  clarificationPrompts?: string[];
  metadata?: Record<string, any>;
}

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  requirements?: string[];
  guidance?: string;
  dependencies?: string[];
  validation?: {
    criteria: string[];
    errorPatterns?: string[];
  };
}

class SimpleWorkflowServer {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  constructor() {
    this.loadWorkflows();
  }

  private loadWorkflows(): void {
    try {
      const specDir = join(process.cwd(), 'spec', 'examples');
      const files = readdirSync(specDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        if (file.includes('invalid') || file.includes('schema')) continue;
        
        try {
          const content = readFileSync(join(specDir, file), 'utf8');
          const workflow = JSON.parse(content) as WorkflowDefinition;
          this.workflows.set(workflow.id, workflow);
          console.error(`Loaded workflow: ${workflow.id}`);
        } catch (error) {
          console.error(`Error loading workflow ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  }

  public async listWorkflows(): Promise<CallToolResult> {
    try {
      const workflows = Array.from(this.workflows.values()).map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        stepCount: w.steps.length,
        metadata: w.metadata
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ workflows }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
        }],
        isError: true
      };
    }
  }

  public async getWorkflow(workflowId: string): Promise<CallToolResult> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Workflow not found: ${workflowId}` }, null, 2)
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(workflow, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
        }],
        isError: true
      };
    }
  }

  public async getNextStep(workflowId: string, completedSteps: string[] = []): Promise<CallToolResult> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Workflow not found: ${workflowId}` }, null, 2)
          }],
          isError: true
        };
      }

      // Find next step that isn't completed and has all dependencies met
      const nextStep = workflow.steps.find(step => {
        if (completedSteps.includes(step.id)) return false;
        
        if (step.dependencies) {
          return step.dependencies.every(dep => completedSteps.includes(dep));
        }
        
        return true;
      });

      if (!nextStep) {
        const allStepsCompleted = workflow.steps.every(step => completedSteps.includes(step.id));
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ 
              isComplete: allStepsCompleted,
              message: allStepsCompleted ? "Workflow completed successfully!" : "No available next step",
              totalSteps: workflow.steps.length,
              completedSteps: completedSteps.length
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            nextStep,
            progress: {
              current: completedSteps.length + 1,
              total: workflow.steps.length,
              percentage: Math.round(((completedSteps.length + 1) / workflow.steps.length) * 100)
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
        }],
        isError: true
      };
    }
  }

  public async validateStep(workflowId: string, stepId: string, output: string): Promise<CallToolResult> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Workflow not found: ${workflowId}` }, null, 2)
          }],
          isError: true
        };
      }

      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Step not found: ${stepId}` }, null, 2)
          }],
          isError: true
        };
      }

      // Basic validation
      const validationResult = {
        stepId,
        isValid: true,
        feedback: [] as string[],
        suggestions: [] as string[]
      };

      // Check if output is provided
      if (!output || output.trim().length === 0) {
        validationResult.isValid = false;
        validationResult.feedback.push("Output is required for step validation");
      }

      // Check minimum length for meaningful output
      if (output.trim().length < 10) {
        validationResult.isValid = false;
        validationResult.feedback.push("Output seems too brief - please provide more detail");
      }

      // Check for common error patterns if defined
      if (step.validation?.errorPatterns) {
        for (const pattern of step.validation.errorPatterns) {
          if (output.toLowerCase().includes(pattern.toLowerCase())) {
            validationResult.isValid = false;
            validationResult.feedback.push(`Potential issue detected: ${pattern}`);
          }
        }
      }

      // Add positive feedback for valid steps
      if (validationResult.isValid) {
        validationResult.feedback.push("Step output looks good!");
        validationResult.suggestions.push("Consider documenting any key decisions or findings");
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(validationResult, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
        }],
        isError: true
      };
    }
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

const workflowServer = new SimpleWorkflowServer();

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