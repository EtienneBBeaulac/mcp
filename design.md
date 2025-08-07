# Loop Optimization Architectural Design

## 1. High-Level Approach

The optimization will implement progressive context disclosure for loops while maintaining existing architectural patterns:

### Progressive Disclosure Strategy
- **First Iteration**: Include loop phase metadata + first step details
- **Subsequent Iterations**: Only current step with minimal context + phase reference
- **Function DSL**: Native MCP feature to reduce duplication via references

### Key Principles (matchPatterns)
- Extend existing `ContextOptimizer` patterns (context-optimizer.ts)
- Follow Clean Architecture service pattern (workflow-service.ts)
- Maintain immutability throughout (no direct mutations)
- Use dependency injection for new components

## 2. Component Breakdown

### Modified Components

#### WorkflowService (workflow-service.ts)
- Modify `getNextStep()` method to detect loop iteration number
- Add logic to build different responses for first vs subsequent iterations
- Integrate with new `LoopContextOptimizer` for minimal context

#### LoopExecutionContext (loop-execution-context.ts)
- Add `getMinimalContext()` method for subsequent iterations
- Add `getPhaseReference()` to generate reference object
- Modify `injectVariables()` to support minimal mode

#### ContextOptimizer (context-optimizer.ts)
- Add `optimizeLoopContext()` method
- Add `createPhaseReference()` for reference generation
- Add `stripLoopMetadata()` for subsequent iterations

### New Components

#### LoopContextOptimizer (new service)
- Injectable service via DI container
- Handles progressive disclosure logic
- Manages phase reference creation

#### FunctionDSL (types/mcp-types.ts enhancement)
- Add `functionDefinitions` to workflow/step interfaces
- Add `functionReferences` for runtime usage

## 3. Data Models

### Enhanced Interfaces

```typescript
// Enhanced context for optimized loops
interface OptimizedLoopContext extends EnhancedContext {
  _currentLoop?: {
    loopId: string;
    loopType: 'for' | 'forEach' | 'while' | 'until';
    iteration: number;
    isFirstIteration: boolean;
    phaseReference?: LoopPhaseReference;
  };
  _loopPhaseReference?: LoopPhaseReference;
}

// Reference to loop phase for subsequent iterations
interface LoopPhaseReference {
  loopId: string;
  phaseTitle: string;
  totalSteps: number;
  functionDefinitions?: FunctionDefinition[];
}

// Function DSL support
interface FunctionDefinition {
  name: string;
  definition: string;
  scope?: 'workflow' | 'loop' | 'step';
}

// Updated WorkflowStep with DSL
interface WorkflowStep {
  // ... existing fields
  functionDefinitions?: FunctionDefinition[];
  functionReferences?: string[]; // References to use
}
```

### MCP Schema Extension

Add to workflow.schema.json:
```json
"functionDefinitions": {
  "type": "array",
  "description": "Function definitions for reducing duplication",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$" },
      "definition": { "type": "string" },
      "scope": { "enum": ["workflow", "loop", "step"] }
    },
    "required": ["name", "definition"]
  }
}
```

## 4. API Contracts

### Modified workflow_next Response

#### First Loop Iteration
```json
{
  "step": { /* full step object */ },
  "guidance": {
    "prompt": "Phase overview + step details",
    "loopPhaseGuidance": { /* phase metadata */ },
    "functionDefinitions": [ /* DSL functions */ ]
  },
  "isComplete": false,
  "context": { /* includes full loop context */ }
}
```

#### Subsequent Iterations
```json
{
  "step": { /* minimal step object */ },
  "guidance": {
    "prompt": "Step details only",
    "phaseReference": "Refer to phase guidance above",
    "functionReferences": ["getStepDetails()", "trackProgress()"]
  },
  "isComplete": false,
  "context": { /* minimal context with reference */ }
}
```

## 5. Key Interactions

```
User -> workflow_next -> WorkflowService.getNextStep()
                              |
                              v
                    Detect loop & iteration
                              |
                    +---------+---------+
                    |                   |
            First iteration      Subsequent iteration
                    |                   |
                    v                   v
        LoopExecutionContext    LoopExecutionContext
            .injectVariables()      .getMinimalContext()
                    |                   |
                    v                   v
        LoopContextOptimizer    LoopContextOptimizer
            .fullContext()          .optimizeLoopContext()
                    |                   |
                    v                   v
            buildStepPrompt()    buildMinimalPrompt()
                    |                   |
                    +--------+----------+
                             |
                             v
                    Return optimized response
```

## 6. Integration Points

### Container Integration (container.ts)
```typescript
// Add to createAppContainer
const loopContextOptimizer = new LoopContextOptimizer();
const workflowService = new DefaultWorkflowService(
  storage, 
  validationEngine, 
  loopContextOptimizer // New dependency
);
```

### Service Integration
- WorkflowService depends on LoopContextOptimizer
- LoopExecutionContext uses ContextOptimizer methods
- ValidationEngine validates function DSL syntax

## 7. Phase 2 Decisions Impact

1. **No Backward Compatibility**: Allows clean redesign of `_currentLoop` structure
2. **Progressive Disclosure**: Core architecture principle driving the design
3. **Native Function DSL**: Integrated at schema level, not workflow-specific
4. **Simplified Testing**: Standard unit/integration test approach

## 8. Complexity Factors

### Maintained as Medium Complexity
- Leverages existing patterns (no new paradigms)
- Clear separation of concerns
- Incremental changes to existing components
- Well-defined integration points

### Risk Mitigation
- Immutable state transitions prevent side effects
- Type safety catches integration issues
- Progressive enhancement (workflows still function without optimization)

## 9. Pattern Alignment

### Following Existing Patterns
- **Service Pattern**: Like ValidationEngine, EnhancedLoopValidator
- **Context Merging**: Extends ContextOptimizer approach (lines 13-28)
- **Dependency Injection**: Manual DI via container (lines 25-29)
- **Type Guards**: Similar to `isLoopStep()` pattern
- **Builder Methods**: Like `buildStepPrompt()` (lines 340-367)

### Code Organization
- Services in `application/services/`
- Types in `types/workflow-types.ts` and `types/mcp-types.ts`
- Schema updates in `spec/workflow.schema.json`

## 10. User Rules Application

### Applied Rules
1. **DI Pattern (Rule #1)**: LoopContextOptimizer injectable via container
2. **Immutability (Rule #2)**: All context operations create new objects
3. **TypeScript (Rule #3)**: Comprehensive interfaces, no `any` types
4. **Documentation (Rule #6)**: Clear inline docs for optimization strategy
5. **Performance (Rule #9)**: Core goal - 60-80% response size reduction

### Design Decisions from Rules
- No mutations in context optimization
- Strong typing for all new interfaces
- Service injection pattern for testability
- Clear documentation of progressive disclosure