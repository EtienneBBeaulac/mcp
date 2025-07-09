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
export interface WorkflowListParams {
  // No parameters for workflow_list
}

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
}

export class WorkflowListTool implements ToolHandler {
  name = "workflow_list";
  description = "Lists all available workflows";
  parameters = {
    type: "object",
    properties: {},
    required: []
  };
  
  constructor(private storage: WorkflowStorage) {}
  
  async execute(params: WorkflowListParams): Promise<WorkflowListResponse> {
    const workflows = await this.storage.listWorkflows();
    return { workflows: workflows.map(w => this.toSummary(w)) };
  }
  
  private toSummary(workflow: Workflow): WorkflowSummary {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      category: workflow.category || 'general',
      version: workflow.version || '1.0.0'
    };
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

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

// validation/rules/file-exists.ts
export class FileExistsRule implements ValidationRule {
  type = "file_exists";
  
  async validate(output: string, rule: FileExistsRuleConfig): Promise<ValidationResult> {
    const filePath = rule.path;
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    
    return {
      valid: exists,
      issues: exists ? [] : [`File ${filePath} does not exist`],
      suggestions: exists ? [] : [`Create the file ${filePath}`]
    };
  }
}

interface FileExistsRuleConfig {
  path: string;
}

// validation/rules/code-compiles.ts
export class CodeCompilesRule implements ValidationRule {
  type = "code_compiles";
  
  async validate(output: string, rule: CodeCompilesRuleConfig): Promise<ValidationResult> {
    const { language, files } = rule;
    
    try {
      switch (language) {
        case 'typescript':
          return await this.validateTypeScript(files);
        case 'python':
          return await this.validatePython(files);
        default:
          return {
            valid: false,
            issues: [`Unsupported language: ${language}`],
            suggestions: ['Add support for this language']
          };
      }
    } catch (error) {
      return {
        valid: false,
        issues: [`Compilation failed: ${error.message}`],
        suggestions: ['Fix syntax errors', 'Check imports', 'Verify dependencies']
      };
    }
  }
  
  private async validateTypeScript(files: string[]): Promise<ValidationResult> {
    // Implementation for TypeScript compilation check
    const result = await exec('npx tsc --noEmit ' + files.join(' '));
    return {
      valid: result.exitCode === 0,
      issues: result.exitCode !== 0 ? [result.stderr] : [],
      suggestions: result.exitCode !== 0 ? ['Fix TypeScript errors'] : []
    };
  }
  
  private async validatePython(files: string[]): Promise<ValidationResult> {
    // Implementation for Python syntax check
    const result = await exec('python -m py_compile ' + files.join(' '));
    return {
      valid: result.exitCode === 0,
      issues: result.exitCode !== 0 ? [result.stderr] : [],
      suggestions: result.exitCode !== 0 ? ['Fix Python syntax errors'] : []
    };
  }
}

interface CodeCompilesRuleConfig {
  language: 'typescript' | 'python' | 'javascript';
  files: string[];
}

// validation/rules/tests-pass.ts
export class TestsPassRule implements ValidationRule {
  type = "tests_pass";
  
  async validate(output: string, rule: TestsPassRuleConfig): Promise<ValidationResult> {
    const { testCommand, timeout = 30000 } = rule;
    
    try {
      const result = await exec(testCommand, { timeout });
      return {
        valid: result.exitCode === 0,
        issues: result.exitCode !== 0 ? [result.stderr] : [],
        suggestions: result.exitCode !== 0 ? ['Fix failing tests'] : []
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Test execution failed: ${error.message}`],
        suggestions: ['Check test configuration', 'Verify test dependencies']
      };
    }
  }
}

interface TestsPassRuleConfig {
  testCommand: string;
  timeout?: number;
}
```

**Benefits**:
- Extensible validation framework
- Easy to add new validation rules
- Testable validation logic
- Runtime validation rule loading

### 3. **Simplified State Management**

Workflow state is managed through a simple, in-memory state manager for MVP, with persistence added later:

```typescript
// orchestration/state.ts
export interface WorkflowState {
  workflowId: string;
  completedSteps: string[];
  currentStep?: string;
  context: Record<string, any>;
  lastUpdated: Date;
  isComplete: boolean;
}

export interface StateManager {
  getState(workflowId: string): Promise<WorkflowState | null>;
  updateState(workflowId: string, state: Partial<WorkflowState>): Promise<void>;
  createState(workflowId: string): Promise<WorkflowState>;
  cleanupExpiredStates(): Promise<void>;
}

// Simple in-memory implementation for MVP
export class InMemoryStateManager implements StateManager {
  private states: Map<string, WorkflowState> = new Map();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours
  
  async getState(workflowId: string): Promise<WorkflowState | null> {
    const state = this.states.get(workflowId);
    if (!state) return null;
    
    // Check if state has expired
    if (Date.now() - state.lastUpdated.getTime() > this.TTL) {
      this.states.delete(workflowId);
      return null;
    }
    
    return state;
  }
  
  async updateState(workflowId: string, updates: Partial<WorkflowState>): Promise<void> {
    const existing = await this.getState(workflowId);
    const updatedState: WorkflowState = {
      ...existing,
      ...updates,
      lastUpdated: new Date()
    } as WorkflowState;
    
    this.states.set(workflowId, updatedState);
  }
  
  async createState(workflowId: string): Promise<WorkflowState> {
    const state: WorkflowState = {
      workflowId,
      completedSteps: [],
      context: {},
      lastUpdated: new Date(),
      isComplete: false
    };
    
    this.states.set(workflowId, state);
    return state;
  }
  
  async cleanupExpiredStates(): Promise<void> {
    const now = Date.now();
    for (const [workflowId, state] of this.states.entries()) {
      if (now - state.lastUpdated.getTime() > this.TTL) {
        this.states.delete(workflowId);
      }
    }
  }
}

// Future: Persistent implementation for production
export class PersistentStateManager implements StateManager {
  constructor(private storage: StateStorage) {}
  
  async getState(workflowId: string): Promise<WorkflowState | null> {
    return await this.storage.getState(workflowId);
  }
  
  async updateState(workflowId: string, updates: Partial<WorkflowState>): Promise<void> {
    const existing = await this.getState(workflowId);
    const updatedState = { ...existing, ...updates, lastUpdated: new Date() };
    await this.storage.updateState(workflowId, updatedState);
  }
  
  async createState(workflowId: string): Promise<WorkflowState> {
    const state: WorkflowState = {
      workflowId,
      completedSteps: [],
      context: {},
      lastUpdated: new Date(),
      isComplete: false
    };
    
    await this.storage.updateState(workflowId, state);
    return state;
  }
  
  async cleanupExpiredStates(): Promise<void> {
    await this.storage.cleanupExpiredStates();
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
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPServer {
  private tools: Map<string, ToolHandler> = new Map();
  private logger: Logger;
  private stateManager: StateManager;
  private workflowStorage: WorkflowStorage;
  
  constructor() {
    this.logger = new Logger();
    this.stateManager = new InMemoryStateManager(); // Start with simple implementation
    this.workflowStorage = new FileSystemWorkflowStorage();
    this.registerTools();
  }
  
  private registerTools(): void {
    this.tools.set('workflow_list', new WorkflowListTool(this.workflowStorage));
    this.tools.set('workflow_get', new WorkflowGetTool(this.workflowStorage));
    this.tools.set('workflow_next', new WorkflowNextTool(this.stateManager, this.workflowStorage));
    this.tools.set('workflow_validate', new WorkflowValidateTool());
  }
  
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      this.logger.info(`Handling request: ${request.method}`, { requestId: request.id });
      
      const tool = this.tools.get(request.method);
      if (!tool) {
        return this.createErrorResponse(request.id, -32601, 'Method not found');
      }
      
      const result = await tool.execute(request.params);
      return this.createSuccessResponse(request.id, result);
    } catch (error) {
      this.logger.error('Request handling error', { 
        requestId: request.id, 
        method: request.method, 
        error: error.message 
      });
      
      if (error instanceof WorkflowNotFoundError) {
        return this.createErrorResponse(request.id, -32001, 'Workflow not found', { workflowId: error.workflowId });
      }
      
      if (error instanceof ValidationError) {
        return this.createErrorResponse(request.id, -32002, 'Invalid workflow', { errors: error.errors });
      }
      
      return this.createErrorResponse(request.id, -32603, 'Internal error', { message: error.message });
    }
  }
  
  private createSuccessResponse(id: string | number, result: any): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      result
    };
  }
  
  private createErrorResponse(id: string | number, code: number, message: string, data?: any): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data
      }
    };
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
  private cache: Map<string, { workflow: Workflow; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(basePath: string = '~/.modelcontextprotocol/workflows/') {
    this.basePath = path.resolve(basePath);
    this.validator = new WorkflowValidator();
    this.ensureDirectoryExists();
  }
  
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
    }
  }
  
  async listWorkflows(): Promise<WorkflowSummary[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const workflows: WorkflowSummary[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const workflow = await this.loadWorkflow(file);
            workflows.push({
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              category: workflow.category || 'general',
              version: workflow.version || '1.0.0'
            });
          } catch (error) {
            // Log invalid workflow but continue listing others
            console.warn(`Skipping invalid workflow file: ${file}`, error.message);
          }
        }
      }
      
      return workflows;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Return empty array if directory doesn't exist
      }
      throw error;
    }
  }
  
  async getWorkflow(id: string): Promise<Workflow | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.workflow;
    }
    
    const filePath = path.join(this.basePath, `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content);
      
      // Validate against schema
      const validation = this.validator.validate(workflow);
      if (!validation.valid) {
        throw new ValidationError(`Invalid workflow ${id}: ${validation.errors.join(', ')}`, validation.errors);
      }
      
      // Cache the validated workflow
      this.cache.set(id, { workflow, timestamp: Date.now() });
      
      return workflow;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async saveWorkflow(workflow: Workflow): Promise<void> {
    // Validate before saving
    const validation = this.validator.validate(workflow);
    if (!validation.valid) {
      throw new ValidationError(`Invalid workflow: ${validation.errors.join(', ')}`, validation.errors);
    }
    
    const filePath = path.join(this.basePath, `${workflow.id}.json`);
    const content = JSON.stringify(workflow, null, 2);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    // Update cache
    this.cache.set(workflow.id, { workflow, timestamp: Date.now() });
  }
  
  async deleteWorkflow(id: string): Promise<void> {
    const filePath = path.join(this.basePath, `${id}.json`);
    
    try {
      await fs.unlink(filePath);
      this.cache.delete(id);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it already deleted
        return;
      }
      throw error;
    }
  }
  
  async searchWorkflows(query: string): Promise<WorkflowSummary[]> {
    const allWorkflows = await this.listWorkflows();
    const searchTerm = query.toLowerCase();
    
    return allWorkflows.filter(workflow => 
      workflow.name.toLowerCase().includes(searchTerm) ||
      workflow.description.toLowerCase().includes(searchTerm) ||
      workflow.id.toLowerCase().includes(searchTerm)
    );
  }
  
  async validateWorkflow(workflow: Workflow): Promise<ValidationResult> {
    return this.validator.validate(workflow);
  }
  
  private async loadWorkflow(filename: string): Promise<Workflow> {
    const filePath = path.join(this.basePath, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }
}
```

#### 3. **Orchestration Engine (`server/src/orchestration/engine.ts`)**

Manages workflow execution and state transitions:

```typescript
// server/src/orchestration/engine.ts
export interface NextStepResult {
  isComplete: boolean;
  step: Step | null;
  guidance: Guidance | null;
}

export interface Guidance {
  prompt: string;
  modelHint: string;
  requiresConfirmation: boolean;
  validationCriteria: string[];
}

export class WorkflowOrchestrator {
  constructor(
    private stateManager: StateManager,
    private workflowStorage: WorkflowStorage,
    private logger: Logger
  ) {}
  
  async getNextStep(
    workflowId: string,
    completedSteps: string[],
    context: Record<string, any>
  ): Promise<NextStepResult> {
    // Get or create workflow state
    let state = await this.stateManager.getState(workflowId);
    if (!state) {
      state = await this.stateManager.createState(workflowId);
    }
    
    // Update state with completed steps
    await this.stateManager.updateState(workflowId, {
      completedSteps,
      context: { ...state.context, ...context }
    });
    
    // Get workflow definition
    const workflow = await this.workflowStorage.getWorkflow(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }
    
    // Find next step
    const nextStep = this.findNextStep(workflow, completedSteps);
    if (!nextStep) {
      await this.stateManager.updateState(workflowId, { isComplete: true });
      return { isComplete: true, step: null, guidance: null };
    }
    
    // Generate guidance
    const guidance = await this.generateGuidance(workflow, nextStep, context);
    
    // Update state with current step
    await this.stateManager.updateState(workflowId, {
      currentStep: nextStep.id
    });
    
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
    context: Record<string, any>
  ): Promise<Guidance> {
    // Include meta guidance from workflow
    const metaGuidance = workflow.metaGuidance || [];
    const metaGuidanceText = metaGuidance.length > 0 
      ? `\n\n**Meta Guidance**:\n${metaGuidance.map(g => `- ${g}`).join('\n')}`
      : '';
    
    // Generate step-specific guidance
    const stepGuidance = await this.generateStepGuidance(step, context);
    
    // Determine model hints based on step type
    const modelHint = this.determineModelHint(step);
    
    // Generate validation criteria
    const validationCriteria = this.generateValidationCriteria(step);
    
    return {
      prompt: stepGuidance + metaGuidanceText,
      modelHint,
      requiresConfirmation: step.requireConfirmation || false,
      validationCriteria
    };
  }
  
  private async generateStepGuidance(
    step: Step,
    context: Record<string, any>
  ): Promise<string> {
    let guidance = step.prompt;
    
    // Add context-specific guidance
    if (context.taskDescription) {
      guidance += `\n\n**Task Context**: ${context.taskDescription}`;
    }
    
    if (context.files && context.files.length > 0) {
      guidance += `\n\n**Relevant Files**: ${context.files.join(', ')}`;
    }
    
    // Add prep/implement/verify pattern guidance
    guidance += `\n\n**Follow this pattern**:
1. **PREP**: Understand the current state and requirements
2. **IMPLEMENT**: Make focused changes to address the step
3. **VERIFY**: Validate your changes before proceeding`;
    
    return guidance;
  }
  
  private determineModelHint(step: Step): string {
    // Determine appropriate model based on step characteristics
    if (step.title.toLowerCase().includes('plan') || 
        step.title.toLowerCase().includes('analyze') ||
        step.title.toLowerCase().includes('understand')) {
      return 'model-with-strong-reasoning';
    }
    
    if (step.title.toLowerCase().includes('implement') ||
        step.title.toLowerCase().includes('create') ||
        step.title.toLowerCase().includes('modify')) {
      return 'model-with-strong-tool-use';
    }
    
    if (step.title.toLowerCase().includes('test') ||
        step.title.toLowerCase().includes('verify') ||
        step.title.toLowerCase().includes('validate')) {
      return 'model-with-strong-reasoning';
    }
    
    return 'model-with-balanced-capabilities';
  }
  
  private generateValidationCriteria(step: Step): string[] {
    const baseCriteria = [
      'Step requirements are met',
      'Changes are focused and minimal',
      'Code follows project conventions'
    ];
    
    // Add step-specific criteria
    if (step.title.toLowerCase().includes('test')) {
      baseCriteria.push('Tests pass successfully');
      baseCriteria.push('Test coverage is adequate');
    }
    
    if (step.title.toLowerCase().includes('implement')) {
      baseCriteria.push('Code compiles without errors');
      baseCriteria.push('Functionality works as expected');
    }
    
    return baseCriteria;
  }
}
```

---

## Type Definitions

### Core Types

```typescript
// types/workflow.ts
export interface Workflow {
  id: string;
  name: string;
  description: string;
  preconditions?: string[];
  clarificationPrompts?: string[];
  steps: Step[];
  metaGuidance?: string[];
  category?: string;
  version?: string;
}

export interface Step {
  id: string;
  title: string;
  prompt: string;
  askForFiles?: boolean;
  requireConfirmation?: boolean;
}

// types/api.ts
export interface WorkflowGetParams {
  id: string;
}

export interface WorkflowGetResponse {
  id: string;
  name: string;
  description: string;
  preconditions: string[];
  clarificationPrompts: string[];
  steps: Step[];
  metaGuidance: string[];
}

export interface WorkflowNextParams {
  workflowId: string;
  currentStep?: string;
  completedSteps: string[];
  context?: Record<string, any>;
}

export interface WorkflowValidateParams {
  workflowId: string;
  stepId: string;
  output: string;
}

export interface WorkflowValidateResponse {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

// types/errors.ts
export class WorkflowNotFoundError extends Error {
  constructor(public workflowId: string) {
    super(`Workflow not found: ${workflowId}`);
    this.name = 'WorkflowNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StepNotFoundError extends Error {
  constructor(public workflowId: string, public stepId: string) {
    super(`Step ${stepId} not found in workflow ${workflowId}`);
    this.name = 'StepNotFoundError';
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

## Implementation Priorities

### Phase 1: MVP Implementation (2-3 weeks)

**Focus**: Get basic system working with minimal complexity

1. **Core MCP Server**
   - Implement basic JSON-RPC 2.0 server
   - Add `workflow_list` and `workflow_get` tools
   - Use `InMemoryStateManager` for simplicity
   - Basic file-based workflow storage

2. **Essential Components**
   - Workflow schema validation
   - Basic error handling
   - Simple logging
   - Unit tests for core functionality

3. **Success Criteria**
   - Server starts without errors
   - Can list and retrieve workflows
   - MCP inspector can connect
   - All tests passing

### Phase 2: Orchestration Engine (3-4 weeks)

**Focus**: Add workflow execution capabilities

1. **Orchestration Core**
   - Implement `workflow_next` tool
   - Add state management with persistence
   - Implement guidance generation
   - Add model-aware routing hints

2. **Validation Framework**
   - Plugin-based validation system
   - Basic validation rules (file-exists, code-compiles)
   - Implement `workflow_validate` tool

3. **Enhanced Features**
   - Workflow state persistence
   - Better error handling and recovery
   - Performance optimizations

### Phase 3: Production Readiness (4-6 weeks)

**Focus**: Advanced features and production deployment

1. **Advanced Orchestration**
   - Complex workflow patterns
   - Dynamic adaptation
   - Performance monitoring
   - Security hardening

2. **Production Features**
   - Database storage backend
   - Horizontal scaling support
   - Advanced monitoring and observability
   - Comprehensive security measures

## Migration Paths

### State Management Evolution

```typescript
// Phase 1: Simple in-memory state
const stateManager = new InMemoryStateManager();

// Phase 2: Add persistence
const stateManager = new PersistentStateManager(new FileStorage());

// Phase 3: Production database
const stateManager = new PersistentStateManager(new DatabaseStorage());
```

### Storage Backend Evolution

```typescript
// Phase 1: File-based storage
const storage = new FileSystemWorkflowStorage();

// Phase 2: Add caching and optimization
const storage = new CachedFileSystemWorkflowStorage();

// Phase 3: Database storage
const storage = new DatabaseWorkflowStorage();
```

### Validation Rule Expansion

```typescript
// Phase 1: Basic rules
const rules = [new FileExistsRule(), new CodeCompilesRule()];

// Phase 2: Advanced rules
const rules = [
  new FileExistsRule(),
  new CodeCompilesRule(),
  new TestsPassRule(),
  new SecurityScanRule()
];

// Phase 3: Custom rules
const rules = [
  ...basicRules,
  new CustomValidationRule(),
  new AIValidationRule()
];
```

---

**Note**: This architecture guide describes the planned implementation. The actual system is currently in the specification phase and will be implemented according to this design. 