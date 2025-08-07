# Loop Optimization Specification

## Task Description

Optimize the WorkRail workflow loop handling to reduce response payload size during loop iterations by implementing progressive context disclosure and introducing native function DSL support to the MCP schema.

Currently, the entire loop structure and all context data is serialized and sent on every iteration of a loop, causing unnecessarily large responses. This optimization will implement a progressive disclosure pattern where the first iteration provides the loop phase overview with the first step, and subsequent iterations only include the current step information with references back to the phase context.

## Key Objectives & Success Criteria

### Primary Objectives
1. **Reduce Loop Response Size**: Implement progressive disclosure to minimize redundant data in loop iterations
2. **Add Native Function DSL**: Extend MCP schema to support function definitions that agents can reference
3. **Maintain Loop Functionality**: Ensure all existing loop features continue to work correctly

### Success Criteria
- First loop iteration includes phase overview + first step details
- Subsequent iterations only include current step with phase reference
- Function DSL is integrated into MCP schema and usable across all workflow components
- All existing workflows continue to function without modification
- Tests verify the optimization works correctly
- Response size is significantly reduced (target: 60-80% reduction for subsequent iterations)

## Scope and Constraints

### In Scope
1. Modify `WorkflowService.getNextStep()` to implement progressive disclosure
2. Update `LoopExecutionContext` to minimize serialized state
3. Extend `ContextOptimizer` with loop-specific optimization methods
4. Add function DSL support to MCP schema
5. Update response building logic to use DSL references
6. Create tests to verify optimization behavior
7. Update type definitions as needed

### Out of Scope
1. Backward compatibility (breaking changes are allowed)
2. Context size limit handling
3. Performance metrics/monitoring
4. Loop resumption in the middle (future enhancement)
5. Optimization of non-loop workflow responses

### Technical Constraints
- Must follow existing Clean Architecture patterns
- Use dependency injection for new components
- Maintain immutability in state transitions
- Follow TypeScript best practices
- No external dependencies

## Existing Patterns and Conventions

### Architecture Patterns (matchPatterns)
- **Clean Architecture**: Services in application layer, infrastructure adapters
- **Dependency Injection**: Manual DI via `createAppContainer()`
- **Immutable State**: Context merging without mutation in `ContextOptimizer`
- **Type Safety**: Comprehensive TypeScript interfaces and type guards

### Code Conventions
- Services suffixed with `Service` (e.g., `WorkflowService`)
- Context types in `types/workflow-types.ts`
- Validation logic separated in `ValidationEngine`
- Error handling via custom error classes

## System Integration Approach

### Component Integration
1. **WorkflowService**: Modify `getNextStep()` to detect loop iteration and apply progressive disclosure
2. **LoopExecutionContext**: Add methods to generate minimal context for subsequent iterations
3. **ContextOptimizer**: Add `optimizeLoopContext()` method for efficient loop state
4. **Type System**: Update `EnhancedContext` interface to support optimized loop data

### API Changes
- Modify `_currentLoop` structure to be minimal
- Add `_loopPhaseReference` for subsequent iterations
- Include function DSL definitions in workflow/step objects

## Impact on Components and Workflows

### Direct Impact
- `workflow-service.ts`: Core logic changes
- `loop-execution-context.ts`: New optimization methods
- `context-optimizer.ts`: Additional optimization strategies
- `workflow-types.ts`: Interface updates
- MCP schema files: Function DSL addition

### Indirect Impact
- Existing workflows will receive smaller responses automatically
- Agents will need to understand phase references
- Validation engine may need updates for DSL syntax

## Testing and Quality Alignment

### Test Strategy (applyUserRules - rule #4)
1. **Unit Tests**: Test individual optimization methods
2. **Integration Tests**: Verify loop behavior with optimization
3. **Response Size Tests**: Compare before/after payload sizes
4. **DSL Tests**: Validate function definition and reference system

### Quality Requirements
- Maintain existing test coverage
- Document optimization strategy inline (rule #6)
- Use TypeScript strict mode
- Follow conventional commits

## Phase 2 Decisions Incorporated

1. **No Backward Compatibility**: Free to redesign API structure
2. **Progressive Disclosure**: Phase overview + first step, then minimal steps
3. **Native Function DSL**: Extend MCP schema officially
4. **Simplified Scope**: No context size worries or performance metrics
5. **Standard Testing**: Integration and unit tests for verification

## Complexity Confirmation

This remains a **Medium complexity** task:
- Clear optimization objectives
- Well-defined implementation approach  
- Leverages existing patterns
- No architectural changes required
- Manageable scope across 4-5 files