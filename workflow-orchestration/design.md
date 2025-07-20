# Systemic Bug Investigation Workflow Enhancement - Architectural Design

## 1. High-Level Approach

### Design Philosophy
This enhancement leverages the proven patterns from `coding-task-workflow.json` to transform the linear bug investigation workflow into an adaptive, intelligent system while maintaining backward compatibility and the core principle of evidence-based diagnosis without proposing fixes.

### Core Strategy
- **Pattern Replication**: Follow `coding-task-workflow.json` architectural patterns exactly
- **Schema Compliance**: Work within existing JSON schema constraints through segmentation
- **Graceful Enhancement**: Add adaptive features without breaking existing functionality
- **Clean Integration**: Leverage existing MCP infrastructure and validation systems

### Enhancement Architecture Overview
```
Phase 0: Triage + Automation Setup
    ↓
Phase 1: Analysis (Simple/Standard/Complex branching)
    ↓
Phase 2b: Dynamic Re-triage (NEW)
    ↓
Phase 3b: Context Documentation (NEW)
    ↓
Phase 4b: Evidence Collection Cycles (NEW)
    ↓
Phase 5b: Devil's Advocate Review (NEW)
    ↓
Phase 6b: Final Context Update (NEW)
    ↓
Phase 6: Diagnostic Writeup
```

## 2. Component Breakdown

### 2.1 JSON Workflow Structure

#### Modified Components
- **metaGuidance Array**: Split into 22+ items (256 char limit compliance)
- **Existing Steps**: Add `runCondition` and `requireConfirmation` logic
- **Context Variables**: Add automation and investigation state management

#### New Step Components
1. **phase-0b-automation-setup**
   - Purpose: Capture user automation preferences
   - Context Variables Set: `automationLevel`, `investigationScope`
   - Pattern: Identical to coding workflow Phase 0 automation queries

2. **phase-2b-dynamic-retriage**
   - Purpose: Enable complexity adjustments mid-investigation
   - Conditional Logic: Triggered for standard/complex bugs
   - Context Variables: `proposedRetriage`, `complexityReason`

3. **phase-3b-context-documentation**
   - Purpose: Generate `INVESTIGATION_CONTEXT.md` files
   - Word Limits: 1000 (High), 2000 (Medium/Low)
   - Update Triggers: After hypothesis formation, evidence collection

4. **phase-4b-evidence-cycle**
   - Purpose: Iterative instrumentation/evidence collection
   - Pattern: PREP → INSTRUMENT → VALIDATE cycle
   - Retry Logic: 2-attempt limit with fallback protocols

5. **phase-5b-devils-advocate-hypothesis-review**
   - Purpose: Rigorous hypothesis validation
   - Confidence Scoring: 1-10 scale with 9.0+ threshold
   - Auto-proceed: High automation + confidence ≥9.0

6. **phase-6b-final-context-update**
   - Purpose: Complete investigation documentation
   - Content: Final evidence summary, handoff instructions
   - Git Integration: Commit documentation changes

### 2.2 Context Variable Architecture

#### New Context Variables
```typescript
interface InvestigationContext {
  // Existing (enhanced)
  bugComplexity: "simple" | "standard" | "complex";
  projectType: string;
  debuggingMechanism: string;
  
  // New automation control
  automationLevel: "High" | "Medium" | "Low";
  investigationScope: "focused" | "comprehensive" | "exhaustive";
  
  // New state management
  confidenceScore: number; // 1-10 scale
  proposedRetriage: boolean;
  complexityReason: string;
  contextDocPath: string;
  
  // New evidence tracking
  hypothesisCount: number; // H1-H5 tracking
  evidenceQuality: number; // 1-10 scale
  iterationCycle: number; // Evidence collection cycles
}
```

### 2.3 Conditional Logic Architecture

#### runCondition Patterns
Following coding workflow conventions:

```json
// Automation-based confirmation
{
  "requireConfirmation": {
    "or": [
      {"var": "automationLevel", "equals": "Low"},
      {"var": "automationLevel", "equals": "Medium"}
    ]
  }
}

// Complexity-based execution
{
  "runCondition": {
    "and": [
      {"var": "bugComplexity", "not_equals": "simple"},
      {"var": "automationLevel", "not_equals": "High"}
    ]
  }
}

// Re-triage logic
{
  "runCondition": {
    "or": [
      {"var": "proposedRetriage", "equals": true},
      {"and": [
        {"var": "bugComplexity", "equals": "complex"},
        {"var": "evidenceQuality", "lt": 7}
      ]}
    ]
  }
}
```

## 3. Data Models

### 3.1 Enhanced Workflow Schema
No schema changes required - working within existing constraints:

```json
{
  "metaGuidance": [
    // Split into 256-char segments
    "INVESTIGATION DISCIPLINE: Never propose fixes until Phase 6",
    "HYPOTHESIS RIGOR: Max 5 hypotheses with quantified scoring",
    "AUTOMATION LEVELS: High=auto-approve >8, Medium=standard, Low=extra confirmations",
    // ... 19 more items
  ],
  "steps": [
    {
      "id": "phase-0b-automation-setup",
      "runCondition": {"var": "bugComplexity", "not_equals": "undefined"},
      "requireConfirmation": {
        "or": [
          {"var": "automationLevel", "equals": "Low"},
          {"var": "automationLevel", "equals": "Medium"}
        ]
      }
    }
    // ... additional steps
  ]
}
```

### 3.2 Context Documentation Schema
```markdown
# INVESTIGATION_CONTEXT.md Structure
## Investigation Progress
- Complexity: {bugComplexity}
- Automation: {automationLevel}
- Current Phase: {currentPhase}

## Evidence Summary
- Hypotheses: H1-H{hypothesisCount}
- Confidence: {confidenceScore}/10
- Quality Score: {evidenceQuality}/10

## Context Variables
- All variable states and values
- Variable change history

## Handoff Instructions
- Files to attach when resuming
- Critical decisions made
- Next steps for continuation
```

## 4. API Contracts

### 4.1 MCP Tool Integration
No new API endpoints - leveraging existing MCP tools:

#### Enhanced workflow_next Usage
```json
// Request with new context variables
{
  "workflowId": "systematic-bug-investigation",
  "completedSteps": ["phase-0-triage", "phase-0b-automation-setup"],
  "context": {
    "bugComplexity": "standard",
    "automationLevel": "High",
    "investigationScope": "comprehensive",
    "confidenceScore": 8.5
  }
}
```

#### Context File Generation
```typescript
// Triggered by specific steps
const contextUpdate = {
  phase: "phase-3b-context-documentation",
  wordLimit: automationLevel === "High" ? 1000 : 2000,
  content: generateInvestigationContext(variables),
  filePath: `INVESTIGATION_CONTEXT_${timestamp}.md`
};
```

### 4.2 Validation Integration
Leverage existing `ValidationEngine` for new steps:

```json
{
  "validationCriteria": [
    {
      "type": "contains",
      "value": "Confidence Score",
      "message": "Must include quantified confidence scoring (1-10)"
    },
    {
      "type": "regex", 
      "pattern": "H[1-5]",
      "message": "Must use proper hypothesis ID format"
    }
  ]
}
```

## 5. Key Interactions

### 5.1 Workflow Execution Flow
```
User Request → workflow_list → workflow_get → workflow_next Loop
                                                    ↓
Context Variables Set → Conditional Evaluation → Step Execution
                                                    ↓
Step Output → workflow_validate → Context Update → Next Step
```

### 5.2 Automation Level Control Flow
```
Phase 0b: User Selects Automation Level
    ↓
Context Variable Set: automationLevel
    ↓
Subsequent Steps: Conditional requireConfirmation
    ↓
High: Auto-proceed (confidence >8)
Medium/Low: Request user confirmation
```

### 5.3 Context Documentation Flow
```
Investigation Milestone → Context Update Trigger
    ↓
Generate INVESTIGATION_CONTEXT.md
    ↓
Word Limit Based on Automation Level
    ↓
File Creation with Timestamp
    ↓
Git Commit (if available) or Fallback Logging
```

## 6. Integration Points

### 6.1 Existing System Integration

#### Condition Evaluator Integration
- **Component**: `src/utils/condition-evaluator.ts`
- **Usage**: Evaluate all new `runCondition` logic
- **Pattern**: Existing `and/or/not` operators with variable references
- **Safety**: Graceful fallback on evaluation errors

#### Validation Engine Integration
- **Component**: `src/application/services/validation-engine.ts`
- **Usage**: Validate devil's advocate review outputs
- **Pattern**: Existing validation criteria with context-aware rules
- **Enhancement**: Support for confidence scoring validation

#### Workflow Storage Integration
- **Component**: `SchemaValidatingWorkflowStorage`
- **Usage**: Automatic validation of enhanced workflow JSON
- **Pattern**: Existing decorator pattern with AJV validation
- **Compliance**: All changes pass existing schema validation

### 6.2 MCP Protocol Integration

#### Tool Integration Points
```typescript
// workflow_next with enhanced context
workflowService.getNextStep(workflowId, completedSteps, {
  automationLevel: "High",
  bugComplexity: "standard", 
  confidenceScore: 8.5
});

// workflow_validate for new step outputs
workflowService.validateStepOutput(workflowId, stepId, {
  output: hypothesisReview,
  confidenceScore: 9.2,
  evidenceQuality: 8.8
});
```

#### File System Integration
```typescript
// Context documentation generation
const contextDoc = generateContext(variables, automationLevel);
await fs.writeFile(`INVESTIGATION_CONTEXT_${Date.now()}.md`, contextDoc);

// Git integration with fallbacks
try {
  await gitCommit("docs(investigation): update context documentation");
} catch (error) {
  logToContextFile("Git unavailable, manual commit required", error);
}
```

## 7. Clarification Decisions Impact

### 7.1 Schema Constraint Resolution
**Decision**: Use multiple 256-character metaGuidance items
**Impact**: Enhanced guidance split into 22 manageable segments
**Implementation**: Array of focused guidance strings

### 7.2 Automation Level Adoption
**Decision**: Follow coding workflow automation patterns exactly
**Impact**: Consistent user experience across workflow types
**Implementation**: Identical `requireConfirmation` conditional logic

### 7.3 Context Persistence Strategy
**Decision**: Generate `INVESTIGATION_CONTEXT.md` files at milestones
**Impact**: Enables long investigation session continuity
**Implementation**: Automation-level-controlled documentation generation

### 7.4 Tool Integration Approach
**Decision**: Extensive MCP tool usage with graceful fallbacks
**Impact**: Robust error handling and user guidance
**Implementation**: Try-catch patterns with alternative approaches

## 8. Complexity Considerations

### 8.1 Large Complexity Justification
Despite coding workflow patterns reducing implementation risk:
- **Scope**: 8 enhancements across 6 workflow phases
- **Integration**: Multiple conditional logic integration points
- **Quality**: Comprehensive testing and validation requirements
- **Compatibility**: Backward compatibility maintenance needs

### 8.2 Risk Mitigation Strategies

#### Schema Compliance
- Continuous validation with `workflow_validate_json`
- Character count monitoring for all text fields
- Regular validation checkpoints during implementation

#### Conditional Logic Complexity
- Use proven patterns from coding workflow exactly
- Comprehensive unit testing for all `runCondition` paths
- Fallback behavior for condition evaluation failures

#### Context Variable Management
- Clear variable lifecycle documentation
- State persistence across workflow sessions
- Variable conflict prevention with investigation namespace

#### Performance Considerations
- Minimal overhead for conditional evaluation (<100ms)
- Efficient context file generation (<500ms)
- Memory usage within existing application bounds

## 9. Implementation Readiness

### 9.1 Prerequisites Satisfied
✅ **Pattern Analysis**: Coding workflow patterns thoroughly understood
✅ **Schema Constraints**: 256-character limits and compliance strategy defined
✅ **Integration Points**: MCP tool usage and existing component leverage planned
✅ **Quality Standards**: Testing and validation requirements established

### 9.2 Next Phase Preparation
- **Implementation Plan**: Ready for detailed step-by-step breakdown
- **Test Strategy**: Unit and integration test approach defined  
- **Risk Mitigation**: Comprehensive fallback and error handling planned
- **Quality Assurance**: Validation criteria and success metrics established

---

**Design Status**: Comprehensive architectural design complete. Ready for detailed implementation planning with clear integration strategy and risk mitigation approaches. 