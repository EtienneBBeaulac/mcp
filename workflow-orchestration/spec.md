# Systemic Bug Investigation Workflow Enhancement Specification

## Project Overview

**Objective**: Enhance the existing `systemic-bug-investigation.json` workflow by implementing 8 adaptive features based on patterns from the `coding-task-workflow.json` to improve investigation rigor, user experience, and workflow adaptability.

**Version**: Upgrade from v1.0.0 to v1.1.0 (backward-compatible enhancement)

**Scope**: JSON workflow file modification with comprehensive testing and validation

## Task Description

### Primary Goal
Transform the current linear bug investigation workflow into an adaptive, intelligent system that adjusts its rigor based on user preferences and investigation complexity while maintaining the core principle of evidence-based diagnosis without proposing fixes.

### Specific Enhancements Required
Based on the coding workflow analysis and clarified requirements:

1. **Fix JSON Syntax Error**: Resolve the extra quote in metaGuidance line 31
2. **Automation Level Integration**: Add user-selectable automation levels (High/Medium/Low) for confirmation control
3. **Dynamic Re-Triage**: Enable complexity adjustments mid-investigation based on findings
4. **Devil's Advocate Review**: Add rigorous hypothesis validation with confidence scoring
5. **Context Documentation**: Implement persistent investigation state via `INVESTIGATION_CONTEXT.md`
6. **Enhanced Failure Handling**: Add retry logic and tool fallbacks
7. **Iterative Cycles**: Refactor instrumentation/evidence collection into repeatable loops
8. **Git Integration**: Add version control with fallback strategies

## Key Objectives & Success Criteria

### Technical Objectives
- ✅ **Schema Compliance**: Pass `workflow_validate_json` validation
- ✅ **Backward Compatibility**: Existing investigations continue unchanged
- ✅ **Pattern Consistency**: Follow `coding-task-workflow.json` conventions exactly
- ✅ **Performance**: No regression in workflow execution speed

### Quality Objectives
- ✅ **Test Coverage**: >80% test coverage for new conditional logic
- ✅ **Validation**: All new steps pass `workflow_validate` checks
- ✅ **Documentation**: Complete context persistence functionality
- ✅ **Error Handling**: Graceful degradation when tools fail

### User Experience Objectives
- ✅ **Automation Control**: Users can select investigation rigor level
- ✅ **Context Persistence**: Long investigations survive session breaks
- ✅ **Adaptive Flow**: Workflow adjusts based on complexity discoveries
- ✅ **Quality Assurance**: Devil's advocate review ensures rigor

## Scope and Constraints

### In Scope
1. **JSON File Modifications**: All changes to `systemic-bug-investigation.json`
2. **Context Documentation**: Creation of `INVESTIGATION_CONTEXT.md` generation logic
3. **Conditional Logic**: Implementation of `runCondition` patterns for step execution
4. **Validation Criteria**: Enhanced step output validation using existing `ValidationEngine`
5. **Testing**: Unit and integration tests for new functionality
6. **Git Workflow**: Branch creation, commits, and merge processes

### Out of Scope
- **Schema Changes**: No modifications to `workflow.schema.json`
- **Core Infrastructure**: No changes to MCP server or validation engine
- **UI Components**: No frontend or interface modifications
- **External Dependencies**: No new package requirements

### Technical Constraints
1. **Schema Limits**: 
   - metaGuidance: 256 characters per item
   - prompt: 2048 characters maximum
   - agentRole: 1024 characters maximum
   - id pattern: `^[a-z0-9-]+$` (lowercase, no underscores)

2. **Architecture Constraints**:
   - Must use existing `ConditionEvaluator` for `runCondition` logic
   - Must leverage existing `ValidationEngine` for step validation
   - Must maintain Clean Architecture principles
   - Must support graceful degradation when git unavailable

3. **Compatibility Constraints**:
   - Backward compatible with existing workflow executor
   - Must not break existing MCP tool integrations
   - Context variables must be optional for existing users

## Technical Approach

### 1. Schema Compliance Strategy
- **metaGuidance Segmentation**: Split long guidance into multiple 256-character items
- **JSON Syntax Fix**: Remove extra quote on line 31
- **Validation**: Use `mcp_workrail_workflow_validate_json` for verification

### 2. Automation Level Implementation
Following `coding-task-workflow.json` patterns:

```json
{
  "requireConfirmation": {
    "or": [
      {"var": "automationLevel", "equals": "Low"},
      {"var": "automationLevel", "equals": "Medium"}
    ]
  }
}
```

**Context Variables**:
- `automationLevel`: "High"|"Medium"|"Low"
- `bugComplexity`: "simple"|"standard"|"complex" (existing)
- `investigationScope`: "focused"|"comprehensive"|"exhaustive" (new)

### 3. Conditional Step Architecture
**Pattern**: Follow coding workflow's `runCondition` structure:

```json
{
  "runCondition": {
    "and": [
      {"var": "bugComplexity", "not_equals": "simple"},
      {"var": "automationLevel", "not_equals": "High"}
    ]
  }
}
```

### 4. Context Documentation Implementation
**Files Created**:
- `INVESTIGATION_CONTEXT.md`: Generated by new steps
- Updated after phases: 2b, 4b, evidence collection
- Word limits: 1000 (High automation), 2000 (Medium/Low)

**Content Structure**:
```markdown
## Investigation Progress
## Evidence Summary  
## Hypothesis Status
## Context Variables
## Handoff Instructions
```

### 5. Devil's Advocate Review Integration
**New Step**: `phase-5b-devils-advocate-hypothesis-review`
- Confidence scoring with `confidenceScore` context variable
- Validation criteria with quantified thresholds
- Auto-proceed if `automationLevel=High` and `confidenceScore ≥ 9.0`

## Implementation Requirements

### JSON Structure Changes

#### New Steps to Add:
1. **phase-0b-automation-setup** (after triage)
2. **phase-2b-dynamic-retriage** (after analysis)  
3. **phase-3b-context-documentation** (after hypothesis formation)
4. **phase-4b-evidence-cycle** (iterative evidence collection)
5. **phase-5b-devils-advocate-review** (after root cause confirmation)
6. **phase-6b-final-context-update** (before diagnostic writeup)

#### metaGuidance Enhancements:
Split existing long items and add:
- Automation level usage guidelines
- Context documentation triggers  
- Git fallback protocols
- Tool failure recovery procedures

#### Context Variables Required:
- `automationLevel`: Set in phase-0b
- `investigationScope`: Set based on complexity
- `confidenceScore`: Set in devil's advocate review
- `proposedRetriage`: Flag for complexity changes
- `contextDocPath`: Path to investigation context file

### Testing Strategy

#### Unit Tests Required:
1. **JSON Schema Validation**: Verify all changes pass validation
2. **Conditional Logic**: Test `runCondition` evaluation for all new steps
3. **Context Variable Management**: Verify variable persistence and updates
4. **Automation Level Behavior**: Test confirmation logic for all levels

#### Integration Tests Required:
1. **End-to-End Workflow**: Complete investigation simulation
2. **Context Documentation**: Verify file generation and updates
3. **Devil's Advocate Review**: Test confidence scoring logic
4. **Git Integration**: Test branch creation, commits, fallbacks

#### Test Files to Extend:
- `tests/unit/workflow-validation.test.ts`
- `tests/integration/enhanced-validation-integration.test.ts`
- Create: `tests/unit/bug-investigation-workflow.test.ts`

### Quality Assurance Requirements

#### Code Quality Standards:
- Follow existing TypeScript/Jest patterns
- Maintain Clean Architecture principles
- Use existing validation and error handling patterns
- Document all new context variables

#### Performance Requirements:
- No regression in workflow execution time
- Context file generation <500ms
- Conditional evaluation <100ms per step
- Memory usage within existing bounds

#### Security Requirements:
- Use existing `sanitizeId` for file paths
- Follow `assertWithinBase` for file operations  
- Validate all user inputs via existing patterns
- No direct code execution in workflow JSON

## Risk Mitigation

### Technical Risks:
1. **Schema Violation**: Continuous validation with `workflow_validate_json`
2. **Backward Compatibility**: Thorough regression testing
3. **Context File Conflicts**: Use unique timestamped filenames
4. **Git Unavailability**: Implement fallback logging to context files

### Implementation Risks:
1. **Complex Conditional Logic**: Use proven patterns from coding workflow
2. **Context Variable Conflicts**: Namespace with `investigation_` prefix
3. **File System Issues**: Graceful error handling with user feedback
4. **Performance Degradation**: Profile conditional evaluation logic

## Success Metrics

### Quantitative Metrics:
- ✅ JSON validation: 100% pass rate
- ✅ Test coverage: >80% for new functionality
- ✅ Performance: <10% regression in execution time
- ✅ Error handling: 100% graceful degradation coverage

### Qualitative Metrics:
- ✅ Pattern consistency with coding workflow
- ✅ Maintainable and readable conditional logic
- ✅ Comprehensive context documentation
- ✅ User experience improvement validation

## Dependencies

### Required Tools:
- `mcp_workrail_workflow_validate_json`: JSON validation
- `workflow_validate`: Step output validation  
- `edit_file`: File modification capabilities
- `run_terminal_cmd`: Git operations (with fallbacks)

### Required Files:
- `workflow-orchestration/workflows/systemic-bug-investigation.json` (modify)
- `workflow-orchestration/spec/workflow.schema.json` (reference only)
- `workflow-orchestration/tests/unit/workflow-validation.test.ts` (extend)

### External Dependencies:
- Existing MCP workflow execution infrastructure
- Jest testing framework
- Git (optional, with fallback logging)

## Acceptance Criteria

### Technical Acceptance:
1. Modified workflow passes `workflow_validate_json` validation
2. All new conditional steps execute correctly via `workflow_next`
3. Context documentation generates valid markdown files
4. Devil's advocate review produces quantified confidence scores
5. Git integration works with proper fallback behavior

### Functional Acceptance:
1. Users can select automation levels and see appropriate confirmation behavior
2. Investigations can be paused and resumed using context documentation
3. Complexity can be adjusted mid-investigation based on findings
4. Hypothesis validation includes rigorous adversarial analysis
5. All tool failures degrade gracefully with clear user guidance

### Quality Acceptance:
1. >80% test coverage for all new functionality
2. Zero regressions in existing workflow behavior  
3. Performance within 10% of baseline execution time
4. Complete documentation of all new features and context variables
5. Successful integration with existing MCP tool ecosystem

---

**Final Complexity Classification Confirmation**: The Large complexity classification remains appropriate given the comprehensive scope, multiple architectural touchpoints, and stringent quality requirements while leveraging established patterns for risk mitigation. 