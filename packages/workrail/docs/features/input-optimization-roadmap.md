# Input Context Optimization Roadmap

## Phase 1: Agent Education (Immediate)
**Timeline**: Can deploy today
**Effort**: Low

1. Update workflow metaGuidance with context management rules
2. Add explicit prompts about what context to send
3. Create agent documentation

**Impact**: 40-60% reduction just from better agent behavior

## Phase 2: Schema Enhancement (Short-term)
**Timeline**: 1-2 weeks
**Effort**: Medium

1. Add `contextRequirements` to schema v0.3.0:
   ```json
   {
     "id": "step-id",
     "contextRequirements": {
       "required": ["field1", "field2"],
       "optional": ["field3"],
       "exclude": ["largeArray"],
       "maxSize": 5120
     }
   }
   ```

2. Add validation service to enforce requirements
3. Log metrics on context sizes

**Impact**: 70-80% reduction with explicit requirements

## Phase 3: Smart Context Protocol (Medium-term)
**Timeline**: 1 month
**Effort**: High

1. Implement context fingerprinting:
   ```typescript
   interface OptimizedRequest {
     workflowId: string;
     completedSteps: string[];
     contextHash?: string;
     contextDelta?: object;
   }
   ```

2. Server tracks context state per session
3. Agents only send deltas

**Impact**: 85-95% reduction for long workflows

## Phase 4: Predictive Loading (Long-term)
**Timeline**: 3+ months
**Effort**: Very High

1. ML model learns context patterns
2. Preemptively strips unnecessary data
3. Predictive prefetching of next steps

**Impact**: Near-optimal context sizes

## Quick Wins Available Now

### 1. Update Coding Workflow
Add to `coding-task-workflow-with-loops.json`:

```json
{
  "metaGuidance": [
    "CONTEXT OPTIMIZATION: Only send modified fields in workflow_next",
    "For loops: Send only currentStep + stepIndex, not full arrays",
    "Remove _loopState and _currentLoop from all requests"
  ]
}
```

### 2. Agent Prompt Enhancement
Add to loop body steps:

```
**IMPORTANT**: When calling workflow_next, only send:
- currentStep (not implementationSteps array)
- stepIndex and stepIteration  
- Any new data you've created
Do NOT echo back unchanged context fields.
```

### 3. Context Stripper Utility
Agents can use this pattern:

```typescript
function prepareContext(fullContext: any, stepType: string) {
  const minimal = {
    // Only what's needed
    currentStep: fullContext.currentStep,
    stepIndex: fullContext.stepIndex
  };
  
  // Add step-specific fields
  if (stepType === 'verify') {
    minimal.verificationResult = fullContext.verificationResult;
  }
  
  return minimal;
}
```

## Measuring Success

Track these metrics:
- Average request size per workflow
- P95 request size
- Context validation failures  
- Agent compliance rate

## Backwards Compatibility

All optimizations are additive:
- Old agents still work (just inefficient)
- New agents get benefits immediately
- Gradual migration path