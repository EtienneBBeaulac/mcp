# Systemic Bug Investigation Workflow Enhancement - Project Context

## 1. ORIGINAL TASK CONTEXT

### Task Description
- **Objective**: Enhance `systemic-bug-investigation.json` workflow with 8 adaptive features based on `coding-task-workflow.json` patterns
- **Version**: Upgrade from v1.0.0 to v1.1.0 (backward-compatible)
- **Primary Goal**: Transform linear bug investigation into adaptive, intelligent system with user-selectable rigor levels

### Key Enhancements
1. Fix JSON syntax error (extra quote line 31)
2. Automation level integration (High/Medium/Low)
3. Dynamic re-triage for complexity adjustments
4. Devil's advocate hypothesis review
5. Context documentation persistence via `INVESTIGATION_CONTEXT.md`
6. Enhanced failure handling with tool fallbacks
7. Iterative evidence collection cycles
8. Git integration with graceful degradation

### Complexity Classification
- **Classification**: Large (confirmed in re-triage)
- **Reasoning**: 8 enhancements across 6 workflow phases, JSON schema compliance, sophisticated conditional logic
- **Re-triage Decision**: Maintained Large classification despite helpful coding workflow patterns due to scope and integration complexity

### Automation Level
- **Selected**: High autonomy
- **Implications**: Auto-approve confidence >8, minimal confirmations, summary documentation

## 2. CODEBASE ANALYSIS SUMMARY

### Architecture Patterns Found
- **Clean Architecture**: Domain → Application → Infrastructure layers
- **Decorator Pattern**: `SchemaValidatingWorkflowStorage` wraps base storage
- **Factory Pattern**: `createDefaultWorkflowStorage()` composes layers
- **Dependency Injection**: Constructor-based service injection

### Key Components
- **Workflow Schema**: `spec/workflow.schema.json` (JSON Schema Draft 7)
- **Condition Evaluator**: `src/utils/condition-evaluator.ts` (safe conditional logic)
- **Validation Engine**: `src/application/services/validation-engine.ts` (step output validation)
- **Storage Layer**: Multi-tier with caching, validation, multi-directory support
- **MCP Server**: `src/mcp-server.ts` (protocol implementation)

### Testing Patterns
- **Unit Tests**: `tests/unit/` - Component-level testing with Jest
- **Integration Tests**: `tests/integration/` - End-to-end workflow execution
- **Performance Tests**: `tests/performance/` - Scalability benchmarks
- **Contract Tests**: `tests/contract/` - API compliance validation

### Critical Constraints Discovered
- **metaGuidance**: 256 characters per item maximum
- **prompt**: 2048 characters maximum
- **agentRole**: 1024 characters maximum
- **id pattern**: `^[a-z0-9-]+$` (lowercase only)

## 3. CLARIFICATIONS AND DECISIONS

### Key Questions Resolved
1. **Schema Limits**: Use multiple 256-char metaGuidance items (coding workflow pattern)
2. **Context Persistence**: Create `INVESTIGATION_CONTEXT.md` files with automation-level word limits
3. **Automation Levels**: Adopt identical `automationLevel` pattern from coding workflow
4. **Conditional Logic**: Follow coding workflow's `runCondition` patterns exactly
5. **Versioning**: Use v1.1.0 backward-compatible enhancement
6. **Testing**: >80% coverage requirement matching coding workflow standards
7. **Tool Integration**: Extensive MCP tool usage with graceful fallbacks

### Technical Approach Decisions
- **Pattern Consistency**: Follow `coding-task-workflow.json` conventions exactly
- **Context Variables**: Use `automationLevel`, `bugComplexity`, `investigationScope`, `confidenceScore`
- **Conditional Steps**: Implement sophisticated `runCondition` logic with `and/or/not` operators
- **Validation**: Leverage existing `ValidationEngine` and `ConditionEvaluator`

## 4. SPECIFICATION SUMMARY

### Core Objectives
- **Schema Compliance**: Pass `workflow_validate_json` validation
- **Backward Compatibility**: Existing investigations continue unchanged
- **Pattern Consistency**: Follow coding workflow conventions
- **User Experience**: Automation control, context persistence, adaptive flow

### Success Criteria
- **Technical**: JSON validation 100%, >80% test coverage, <10% performance regression
- **Quality**: All steps pass validation, graceful error handling
- **Functional**: Automation levels work, investigations survive session breaks

### Key Constraints
- **No Schema Changes**: Work within existing `workflow.schema.json`
- **No Infrastructure Changes**: Use existing MCP server and validation engine
- **Backward Compatibility**: Must not break existing workflow executor
- **Performance**: No regression in execution speed

## 5. WORKFLOW PROGRESS TRACKING

### Completed Phases ✅
- **Phase 0**: Intelligent triage (Large complexity, High automation)
- **Phase 1**: Deep codebase analysis (1500 words, architecture understanding)
- **Phase 2**: Informed clarification (7 technical questions resolved)
- **Phase 2b**: Dynamic re-triage (Large classification confirmed)
- **Phase 3**: Specification creation (`spec.md` comprehensive document)
- **Phase 3b**: Context documentation (this document)

### Current Phase 🔄
- **Phase 4**: Architectural Design (`design.md` creation)

### Remaining Phases ⏳
- **Phase 5**: Implementation planning (`implementation_plan.md`)
- **Phase 5b**: Devil's advocate review (plan critique)
- **Phase 5c**: Finalize plan (incorporate feedback)
- **Phase 5d**: Plan sanity check (verify assumptions)
- **Phase 5e**: Update context documentation
- **Phase 6**: Iterative implementation (PREP→IMPLEMENT→VERIFY)
- **Phase 7**: Final review and completion

### Context Variables Set 📋
- `taskComplexity`: "Large"
- `automationLevel`: "High"
- Ready for: `investigationScope`, `confidenceScore`, `proposedRetriage`, `contextDocPath`

## 6. HANDOFF INSTRUCTIONS

### Files to Attach When Resuming
- **Primary**: `workflow-orchestration/spec.md` (comprehensive specification)
- **Reference**: `workflow-orchestration/workflows/coding-task-workflow.json` (pattern template)
- **Target**: `workflow-orchestration/workflows/systemic-bug-investigation.json` (file to modify)
- **Context**: `workflow-orchestration/CONTEXT.md` (this document)

### Key Context for New Agent
- **Task**: Enhance bug investigation workflow with 8 adaptive features using coding workflow patterns
- **Approach**: Follow `coding-task-workflow.json` conventions exactly for consistency
- **Status**: Specification complete, ready for architectural design phase
- **Priority**: Fix JSON syntax error first, then implement conditional logic enhancements

### Critical Decisions NOT to Forget
1. **Pattern Consistency**: Must follow coding workflow patterns exactly
2. **Schema Compliance**: All changes must pass `workflow_validate_json`
3. **Backward Compatibility**: Existing investigations must continue working
4. **Automation Levels**: High=auto-approve confidence >8, Medium/Low=confirmations
5. **Context Documentation**: Generate `INVESTIGATION_CONTEXT.md` at key milestones
6. **Testing**: >80% coverage required for all new conditional logic

### Next Steps for Continuation
1. Continue with Phase 4: Create `design.md` architectural design
2. Reference `spec.md` for detailed implementation requirements
3. Use coding workflow patterns for all conditional logic design
4. Maintain High automation level throughout (minimal confirmations)
5. Prepare for comprehensive implementation planning in Phase 5

---

**Project Status**: Implementation ready. All planning phases complete with comprehensive documentation.

## 4. ARCHITECTURAL DESIGN SUMMARY
- **Approach**: Pattern replication from `coding-task-workflow.json` for consistency and user experience
- **Components**: Enhanced metaGuidance (22→30 items), automation levels, conditional logic, context persistence
- **Integration**: Leverages existing MCP infrastructure, validation engine, condition evaluator
- **Decisions**: Segmented metaGuidance for schema compliance, JSON-first storage, backward compatibility

## 5. IMPLEMENTATION PLAN OVERVIEW
- **Goals**: Transform linear workflow to adaptive system with 8 enhancements, maintain full compatibility
- **Strategy**: Single comprehensive implementation with simultaneous enhancement integration
- **Risks**: Schema validation failures, context variable persistence, tool availability - all mitigated
- **Testing**: >80% coverage via unit/integration tests, schema validation, end-to-end verification
- **Failure Handling**: Git rollback, incremental fallbacks, comprehensive validation gates

## 6. DEVILS ADVOCATE REVIEW INSIGHTS
- **Key Concerns**: Schema constraints, context persistence, tool dependencies, integration complexity
- **Improvements**: Enhanced validation strategy, comprehensive test coverage, fallback protocols
- **Confidence**: 8.5/10 (High) - comprehensive patterns with proven infrastructure
- **Out-of-scope**: Performance optimization, UI changes, new tool development

## 7. UPDATED WORKFLOW PROGRESS
- ✅ **Completed**: phases 0-5e (triage→analysis→clarification→re-triage→spec→context→design→planning→review→finalization→sanity check→context update)
- 🔄 **Current**: Implementation (Phase 6)
- ⏳ **Remaining**: phases 6, 7 (implementation, final review)
- 📁 **Files Created**: spec.md, design.md, implementation_plan.md, CONTEXT.md

## 8. IMPLEMENTATION READINESS
- **Verification**: All files, dependencies, APIs, and tools confirmed available
- **Strategy**: 20-step implementation plan with comprehensive validation at each stage
- **Handoff Points**: Post-implementation validation, final testing, MCP integration verification
- **Status**: Ready for immediate execution with High automation approval 