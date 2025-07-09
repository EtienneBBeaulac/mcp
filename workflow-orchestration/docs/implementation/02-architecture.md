# Architecture Guide

> 🏗️ **System Architecture & Design Decisions for the Workflow Orchestration System**

[![Status](https://img.shields.io/badge/status-specification-orange.svg)](https://github.com/yourusername/workflow-orchestration-system)
[![Spec Version](https://img.shields.io/badge/spec-1.0.0-blue.svg)](specs/)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Component Design](#component-design)
4. [Data Flow](#data-flow)
5. [Technical Decisions](#technical-decisions)
6. [Scalability Considerations](#scalability-considerations)

---

## System Overview

### High-Level Architecture

The Workflow Orchestration System follows a **hybrid orchestration pattern** where an AI Agent collaborates with a specialized MCP server to execute structured workflows.

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│    User     │────▶│   AI Agent      │────▶│ workflowlookup│
│             │     │ (Claude, etc)   │     │  MCP Server  │
└─────────────┘     └─────────────────┘     └──────────────┘
                            │                        │
                            │◀───────────────────────┘
                            │   Structured Guidance
```

### Key Architectural Principles

1. **Agent-Agnostic**: Works with any MCP-compatible agent
2. **Local-First**: All processing happens on user's machine
3. **Guided, Not Forced**: Provides rails while maintaining agent autonomy
4. **Progressive Enhancement**: Simple agents work, advanced agents work better
5. **Transparent**: No hidden magic, just structured guidance

---

## Architecture Patterns

### 1. **Modular Tool Architecture**

Each MCP tool is implemented as a separate module with a consistent interface:

```typescript
// tools/base.ts
export interface ToolHandler {
  name: string;
  description: string;
  parameters: JsonSchema;
  execute(params: any): Promise<any>;
}

// tools/workflow-list.ts
export class WorkflowListTool implements ToolHandler {
  name = "workflow_list";
  description = "Lists all available workflows";
  
  async execute(params: null): Promise<WorkflowListResponse> {
    // Implementation
  }
}
```

**Benefits**:
- Clear separation of concerns
- Easy to test individual tools
- Simple to add new tools
- Consistent interface across all tools

### 2. **Plugin-Based Validation System**

Validation rules are implemented as plugins for extensibility:

```typescript
// validation/rules/base.ts
export interface ValidationRule {
  type: string;
  validate(input: any, rule: any): Promise<ValidationResult>;
}

// validation/rules/file-exists.ts
export class FileExistsRule implements ValidationRule {
  type = "file_exists";
  
  async validate(output: string, rule: any): Promise<ValidationResult> {
    const filePath = rule.path;
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    
    return {
      valid: exists,
      issues: exists ? [] : [`File ${filePath} does not exist`],
      suggestions: exists ? [] : [`Create the file ${filePath}`]
    };
  }
}
```

**Benefits**:
- Extensible validation framework
- Easy to add new validation rules
- Testable validation logic
- Runtime validation rule loading

### 3. **Persistent State Management**

Workflow state is managed through a persistent, concurrent-safe state manager:

```typescript
// orchestration/state.ts
export interface StateManager {
  getState(workflowId: string): Promise<WorkflowState | null>;
  updateState(workflowId: string, state: WorkflowState): Promise<void>;
  persistState(workflowId: string): Promise<void>;
  cleanupExpiredStates(): Promise<void>;
  acquireLock(workflowId: string): Promise<Lock>;
  releaseLock(lock: Lock): Promise<void>;
}

export class PersistentStateManager implements StateManager {
  private storage: StateStorage;
  private locks: Map<string, Lock> = new Map();
  
  constructor(storage: StateStorage) {
    this.storage = storage;
  }
  
  async updateState(workflowId: string, state: WorkflowState): Promise<void> {
    const lock = await this.acquireLock(workflowId);
    try {
      await this.storage.updateState(workflowId, state);
    } finally {
      await this.releaseLock(lock);
    }
  }
}
```

**Benefits**:
- Concurrent access safety
- State persistence across sessions
- Automatic cleanup of old states
- Distributed deployment support

---

## Component Design

### Project Structure

```
workflow-orchestration-system/
├── server/                          # MCP server implementation
│   ├── src/
│   │   ├── index.ts                # Server entry point
│   │   ├── tools/                  # MCP tool implementations
│   │   │   ├── workflow-list.ts    # workflow_list tool
│   │   │   ├── workflow-get.ts     # workflow_get tool
│   │   │   ├── workflow-next.ts    # workflow_next tool
│   │   │   └── workflow-validate.ts # workflow_validate tool
│   │   ├── workflows/              # Workflow storage & retrieval
│   │   │   ├── loader.ts           # Workflow file loader
│   │   │   ├── validator.ts        # Schema validation
│   │   │   └── storage.ts          # Storage abstraction
│   │   ├── validation/             # Workflow validation logic
│   │   │   ├── engine.ts           # Validation engine
│   │   │   ├── rules/              # Validation rule implementations
│   │   │   └── types.ts            # Validation type definitions
│   │   ├── orchestration/          # Workflow orchestration logic
│   │   │   ├── engine.ts           # Orchestration engine
│   │   │   ├── state.ts            # State management
│   │   │   └── guidance.ts         # Guidance generation
│   │   ├── utils/                  # Utility functions
│   │   │   ├── json-rpc.ts         # JSON-RPC utilities
│   │   │   ├── errors.ts           # Error handling
│   │   │   └── logging.ts          # Logging utilities
│   │   └── types/                  # TypeScript type definitions
│   │       ├── workflow.ts         # Workflow schema types
│   │       ├── api.ts              # API request/response types
│   │       └── mcp.ts              # MCP protocol types
│   ├── tests/                      # Server tests
│   │   ├── unit/                   # Unit tests
│   │   ├── integration/            # Integration tests
│   │   └── fixtures/               # Test data
│   ├── package.json                # Server dependencies
│   └── tsconfig.json               # TypeScript configuration
├── workflows/                       # Workflow library
│   ├── core/                       # Bundled production workflows
│   │   ├── ai-task-implementation.json
│   │   ├── mr-review.json
│   │   └── ticket-creation.json
│   ├── examples/                   # Development examples
│   │   ├── valid-workflow.json
│   │   └── invalid-workflow.json
│   └── schemas/                    # Schema definitions
│       └── workflow.schema.json
├── docs/                           # Documentation
│   ├── implementation/             # Implementation guides
│   ├── advanced/                   # Advanced topics
│   └── reference/                  # Reference documentation
├── scripts/                        # Build and deployment scripts
│   ├── build.sh                    # Build script
│   ├── test.sh                     # Test script
│   └── deploy.sh                   # Deployment script
├── .github/                        # GitHub workflows
│   └── workflows/
│       ├── ci.yml                  # Continuous integration
│       └── release.yml             # Release automation
├── package.json                    # Root package.json
├── tsconfig.json                   # Root TypeScript config
├── .eslintrc.js                    # ESLint configuration
├── .prettierrc                     # Prettier configuration
└── README.md                       # Project overview
```

### Core Components

#### 1. **MCP Server (`server/src/index.ts`)**

The main entry point that handles JSON-RPC 2.0 communication:

```typescript
// server/src/index.ts
export class MCPServer {
  private tools: Map<string, ToolHandler> = new Map();
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger();
    this.registerTools();
  }
  
  private registerTools(): void {
    this.tools.set('workflow_list', new WorkflowListTool());
    this.tools.set('workflow_get', new WorkflowGetTool());
    this.tools.set('workflow_next', new WorkflowNextTool());
    this.tools.set('workflow_validate', new WorkflowValidateTool());
  }
  
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      const tool = this.tools.get(request.method);
      if (!tool) {
        return this.createErrorResponse(request.id, -32601, 'Method not found');
      }
      
      const result = await tool.execute(request.params);
      return this.createSuccessResponse(request.id, result);
    } catch (error) {
      return this.createErrorResponse(request.id, -32603, 'Internal error', error);
    }
  }
}
```

#### 2. **Workflow Storage (`server/src/workflows/storage.ts`)**

Abstract storage layer supporting multiple backends:

```typescript
// server/src/workflows/storage.ts
export interface WorkflowStorage {
  listWorkflows(): Promise<WorkflowSummary[]>;
  getWorkflow(id: string): Promise<Workflow | null>;
  saveWorkflow(workflow: Workflow): Promise<void>;
  deleteWorkflow(id: string): Promise<void>;
  searchWorkflows(query: string): Promise<WorkflowSummary[]>;
  validateWorkflow(workflow: Workflow): Promise<ValidationResult>;
}

export class FileSystemWorkflowStorage implements WorkflowStorage {
  private basePath: string;
  private validator: WorkflowValidator;
  
  constructor(basePath: string = '~/.modelcontextprotocol/workflows/') {
    this.basePath = path.resolve(basePath);
    this.validator = new WorkflowValidator();
  }
  
  async listWorkflows(): Promise<WorkflowSummary[]> {
    const files = await fs.readdir(this.basePath);
    const workflows: WorkflowSummary[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const workflow = await this.loadWorkflow(file);
        workflows.push({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          category: workflow.category || 'general',
          version: workflow.version || '1.0.0'
        });
      }
    }
    
    return workflows;
  }
  
  async getWorkflow(id: string): Promise<Workflow | null> {
    const filePath = path.join(this.basePath, `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content);
      
      // Validate against schema
      const validation = this.validator.validate(workflow);
      if (!validation.valid) {
        throw new Error(`Invalid workflow ${id}: ${validation.errors.join(', ')}`);
      }
      
      return workflow;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}
```

#### 3. **Orchestration Engine (`server/src/orchestration/engine.ts`)**

Manages workflow execution and state transitions:

```typescript
// server/src/orchestration/engine.ts
export class WorkflowOrchestrator {
  private stateManager: StateManager;
  private validationEngine: ValidationEngine;
  private logger: Logger;
  
  constructor(
    stateManager: StateManager,
    validationEngine: ValidationEngine,
    logger: Logger
  ) {
    this.stateManager = stateManager;
    this.validationEngine = validationEngine;
    this.logger = logger;
  }
  
  async getNextStep(
    workflowId: string,
    completedSteps: string[],
    context: any
  ): Promise<NextStepResult> {
    // Get workflow
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }
    
    // Find next step
    const nextStep = this.findNextStep(workflow, completedSteps);
    if (!nextStep) {
      return { isComplete: true, step: null, guidance: null };
    }
    
    // Generate guidance
    const guidance = await this.generateGuidance(workflow, nextStep, context);
    
    return {
      isComplete: false,
      step: nextStep,
      guidance
    };
  }
  
  private findNextStep(workflow: Workflow, completedSteps: string[]): Step | null {
    const remainingSteps = workflow.steps.filter(
      step => !completedSteps.includes(step.id)
    );
    
    return remainingSteps.length > 0 ? remainingSteps[0] : null;
  }
  
  private async generateGuidance(
    workflow: Workflow,
    step: Step,
    context: any
  ): Promise<Guidance> {
    // Include meta guidance
    const metaGuidance = workflow.metaGuidance || [];
    
    // Generate step-specific guidance
    const stepGuidance = await this.generateStepGuidance(step, context);
    
    // Determine model hints
    const modelHint = this.determineModelHint(step);
    
    return {
      prompt: stepGuidance,
      modelHint,
      requiresConfirmation: step.requireConfirmation || false,
      validationCriteria: this.generateValidationCriteria(step)
    };
  }
}
```

---

## Data Flow

### Request Flow

1. **User Request**: User asks agent to perform a task
2. **Agent Discovery**: Agent identifies appropriate workflow
3. **Workflow Retrieval**: Agent calls `workflow_get` to retrieve workflow
4. **Step Execution**: Agent calls `workflow_next` to get next step
5. **Validation**: Agent calls `workflow_validate` to validate output
6. **Completion**: Process repeats until workflow is complete

### State Management Flow

1. **State Initialization**: Create workflow state on first request
2. **State Updates**: Update state after each step completion
3. **State Persistence**: Save state to persistent storage
4. **State Recovery**: Recover state on session restart
5. **State Cleanup**: Clean up expired states

### Error Handling Flow

1. **Error Detection**: Catch exceptions in tool execution
2. **Error Classification**: Classify errors by type and severity
3. **Error Response**: Return appropriate error response
4. **Error Logging**: Log errors for debugging
5. **Error Recovery**: Provide recovery suggestions

---

## Technical Decisions

### 1. **JSON-RPC 2.0 Protocol**

**Decision**: Use JSON-RPC 2.0 for MCP communication
**Rationale**: 
- Standard protocol with wide tool support
- Simple request/response model
- Good error handling capabilities
- Language-agnostic

### 2. **File-Based Workflow Storage**

**Decision**: Start with file-based storage for simplicity
**Rationale**:
- No database setup required
- Easy to version control workflows
- Simple to backup and restore
- Can migrate to database later

### 3. **Plugin-Based Validation**

**Decision**: Use plugin architecture for validation rules
**Rationale**:
- Easy to extend with new validation types
- Testable validation logic
- Runtime loading of validation rules
- Separation of concerns

### 4. **Stateful Orchestration**

**Decision**: Maintain workflow state across requests
**Rationale**:
- Supports long-running workflows
- Enables session recovery
- Provides progress tracking
- Enables complex workflow patterns

---

## Scalability Considerations

### Horizontal Scaling

The system can scale horizontally by:

1. **Stateless Design**: MCP server is stateless
2. **Shared Storage**: Use shared storage for workflows
3. **Load Balancing**: Distribute requests across instances
4. **Caching**: Cache frequently accessed workflows

### Performance Optimization

Key performance optimizations:

1. **Workflow Caching**: Cache parsed workflows in memory
2. **Lazy Loading**: Load workflows on demand
3. **Connection Pooling**: Reuse database connections
4. **Async Processing**: Use async/await throughout

### Monitoring and Observability

Essential monitoring:

1. **Request Metrics**: Track request volume and latency
2. **Error Rates**: Monitor error rates by type
3. **Resource Usage**: Track memory and CPU usage
4. **Workflow Usage**: Monitor which workflows are used most

---

**Note**: This architecture guide describes the planned implementation. The actual system is currently in the specification phase and will be implemented according to this design. 