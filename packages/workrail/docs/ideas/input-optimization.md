# Input Context Optimization Ideas

## Problem Statement

Agents currently send the entire accumulated context (15-20KB) on every `workflow_next` call, even though most steps only need a small subset of that data.

## Proposed Solution: Context Requirements Declaration

### 1. Schema Addition

```json
{
  "id": "some-step",
  "title": "Step Title",
  "contextRequirements": {
    "required": ["userId", "projectId"],
    "optional": ["previousResult"],
    "preserve": ["sessionData"],
    "maxSize": 5120  // 5KB limit
  }
}
```

### 2. Validation Service

```typescript
interface IContextValidator {
  validateAndTrim(
    context: any,
    requirements: ContextRequirements,
    stepId: string
  ): {
    context: any;
    warnings: string[];
    sizeBefore: number;
    sizeAfter: number;
  };
}
```

### 3. Agent Behavior

Agents should:
- Only send fields listed in `required` + `optional`
- Preserve fields in `preserve` for future steps
- Remove everything else
- Respect `maxSize` limits

### 4. Backward Compatibility

- If `contextRequirements` not specified, accept any context
- Log warnings for oversized contexts
- Gradually migrate workflows to include requirements

## Alternative: Context Inheritance Chain

Each step explicitly declares what it provides to the next step:

```json
{
  "id": "step-1",
  "contextProvides": {
    "userId": "string",
    "sessionToken": "string"
  }
}
```

## Benefits

1. **Reduced Network Traffic**: 70-90% reduction in request size
2. **Clearer Contracts**: Steps declare dependencies explicitly  
3. **Better Testing**: Can test steps with minimal context
4. **Improved Security**: Less data exposure

## Implementation Plan

1. Add `contextRequirements` to schema (non-breaking)
2. Create context validation service
3. Add logging to measure impact
4. Update workflow documentation
5. Migrate high-traffic workflows first

## Metrics to Track

- Average request size per workflow
- Context validation failures
- Performance improvement
- Agent adoption rate

## Open Questions

1. Should we support JSON Path for nested requirements?
2. How to handle dynamic context needs?
3. Should context requirements be enforced or just advisory?
4. How to handle arrays/collections efficiently?