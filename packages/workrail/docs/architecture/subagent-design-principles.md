# Subagent Design Principles & Catalog

## Overview

This document defines WorkRail's approach to subagent design for agentic IDEs. It outlines the core principles, patterns, and catalog of specialized subagents that enhance WorkRail workflows.

**Philosophy:** Subagents are **specialized cognitive functions**, not task owners. They execute complete, autonomous routines and return structured deliverables to the main agent orchestrator.

---

## Core Principles

### 1. **Cognitive Specialization, Not Task Ownership**

**✅ Good:** "Context Researcher" - Specializes in deep reading and systematic exploration
**❌ Bad:** "Debugger" - Too broad, owns entire debugging workflow

**Rule:** Subagents should embody a **specific cognitive mode** (exploration, challenge, verification) that can be applied across many workflows, not own a complete workflow themselves.

### 2. **Stateless & Self-Contained**

Each subagent invocation is independent:
- **No memory** between calls
- **No conversational refinement**
- **No follow-up questions**

**Implication:** The main agent must provide **all necessary context upfront** in a single, complete work package.

**Pattern:**
```
Main Agent → Subagent: [Complete Context Package]
Subagent: [Autonomous Execution]
Subagent → Main Agent: [Structured Deliverable]
```

### 3. **Autonomous Routine Execution**

Subagents execute **complete routines** from start to finish:
- Receive: Self-contained work package with all context
- Execute: Multi-step routine autonomously
- Return: Named, structured artifact (e.g., `ExecutionFlow.md`)

**Not this:** Iterative back-and-forth, gradual context building, conversational refinement.

### 4. **Depth-Aware Investigation**

For research/exploration tasks, subagents support **configurable depth levels** to balance speed vs thoroughness:

| Level | Name | Time | Use Case |
|-------|------|------|----------|
| 0 | Survey | 1-2 min | "What exists here?" |
| 1 | Scan | 5-10 min | "What are the major components?" |
| 2 | Explore | 15-30 min | "What does each component do?" |
| 3 | Analyze | 30-60 min | "How does this specific logic work?" |
| 4 | Dissect | 60+ min | "What is every line doing?" |

Main agent chooses depth based on uncertainty and importance.

### 5. **Structured Deliverables**

Every subagent routine produces a **named artifact** with a **consistent structure**:

**Standard Output Format:**
```markdown
### Summary (3-5 bullets)
- Key findings

### Detailed Findings
- Component breakdowns
- File citations (file:line)

### Suspicious Points / Concerns / Gaps
- What could be problematic
- What couldn't be determined

### Recommendations
- What main agent should do next
```

**Deliverable Quality Gates:**

Main agent validates each deliverable against these criteria:
- ✅ **Completeness**: All required sections present
- ✅ **Citations**: File:line references for all findings
- ✅ **Gaps Section**: Explicit about limitations and unknowns
- ✅ **Actionability**: Clear next steps or recommendations

**If a deliverable fails quality gates**, the main agent should:
1. Note the gaps in the workflow context
2. Decide if the partial deliverable is sufficient
3. Optionally re-run with clarified context (not automatic)

**Artifact Naming Convention:** Use kebab-case for filenames:
- `execution-flow.md`
- `hypothesis-challenges.md`
- `plan-analysis.md`

### 6. **Explicit Over Implicit**

While agentic IDEs support auto-invocation (system picks subagent based on task description), **WorkRail workflows use explicit delegation**:

```
Use: task(subagent_type="context-researcher", prompt="...")
Not: "Hey, someone gather context for me" (auto-invoke)
```

**Rationale:** Predictability, debuggability, user understanding.

---

## Subagent Invocation Pattern

### **Complete Context Package (SubagentWorkPackage)**

When delegating to a subagent, the main agent provides a complete, self-contained work package:

```typescript
interface SubagentWorkPackage {
  routine: string;           // e.g., "context-gathering"
  depth?: 0 | 1 | 2 | 3 | 4; // For research tasks
  rigor?: 1 | 3 | 5;         // For adversarial tasks
  mission: string;           // What you're trying to accomplish
  target: string[];          // Files/areas to investigate
  context: {
    background: string;      // Bug description, feature requirements
    constraints: string[];   // Rules, patterns, limits
    priorWork: Artifact[];   // Previous deliverables
  };
  deliverable: {
    name: string;            // e.g., "execution-flow.md"
    format: string;          // Required sections
  };
}
```

**Rendered as a delegation prompt:**

```
subagent_type: "<subagent-name>"
prompt: "
  Execute <routine-name> routine at <depth/mode>:
  
  **Your Mission:**
  <What you're trying to accomplish>
  
  **Context You Need:**
  - Bug/Feature/Task Description: <full description>
  - Relevant Background: <previous findings, constraints, etc.>
  - User Preferences: <coding standards, patterns to follow>
  - Prior Work: <what's been done already>
  
  **What to Investigate:**
  - Targets: <specific files/directories/areas>
  - Focus: <specific aspect to emphasize>
  - Constraints: <time budget, scope limits>
  
  **What to Deliver:**
  Create <ArtifactName.md> with:
  1. <Required Section 1>
  2. <Required Section 2>
  ...
"
```

**Key:** Everything the subagent needs is in this single prompt. No follow-ups.

---

## Subagent Catalog

### **Tier 1: Core Subagents (Phase 1)**

Essential subagents for most workflows. These 5 cover the primary cognitive functions needed across debugging, planning, and implementation workflows.

---

#### **1. Context Researcher**

**Cognitive Function:** Deep reading, systematic exploration, execution tracing

**When to Use:**
- "I need to understand how this code works"
- "Map the structure of this system"
- "Trace execution from X to Y"

**Depth Levels:** 0-4 (Survey → Dissect)

**Routine:** `routine-context-gathering`

**Input Parameters:**
- `depth`: 0-4 or level name
- `target`: Files/directories to investigate
- `mission`: What you're trying to understand
- `context`: Background info (bug description, previous findings)
- `deliverable`: What structured output to create

**Output Artifacts:**
- `ComponentMap.md` (depth 0-1)
- `ExecutionFlow.md` (depth 2-3)
- `DetailedAnalysis.md` (depth 4)

**Example Delegation:**
```
"Execute context-gathering at depth=2 (Explore):
 Mission: Understand how user authentication works
 Target: src/auth/*
 Context: Investigating a token validation bug
 Deliverable: ExecutionFlow.md showing login → token validation"
```

**Subagent Description (for auto-invocation):**
> "Gathers and analyzes codebase context using systematic exploration at configurable depths. Specializes in mapping file structures, tracing execution flows, and identifying relevant code sections. Use when you need to understand code before making decisions."

**Recommended Tool Restrictions:**
```yaml
tools:
  - read_file
  - grep_search
  - list_dir
  - codebase_search
  - workflow_list
  - workflow_get
  - workflow_next
  # NO WRITE OPERATIONS: No edit_file, run_terminal_cmd, delete_file
```

**Recommended Model:**
- Depth 0-1: Haiku (fast scanning)
- Depth 2-4: Sonnet (reasoning required)

---

#### **2. Hypothesis Challenger**

**Cognitive Function:** Adversarial reasoning, finding holes, edge case identification

**When to Use:**
- "Challenge my assumptions"
- "Find holes in this hypothesis"
- "What could go wrong with this approach?"

**Routine:** `routine-hypothesis-challenge`

**Input Parameters:**
- `hypotheses`: List of hypotheses/assumptions to challenge
- `evidence`: Supporting evidence for each
- `context`: Background (bug description, findings)
- `deliverable`: What format to return challenges in

**Output Artifacts:**
- `hypothesis-challenges.md`
- `edge-cases.md`
- `adversarial-review.md`

**Example Delegation:**
```
"Challenge these bug hypotheses with rigor=3:
 Hypotheses:
  H1: Bug is in AuthService.validateToken (confidence: 8/10)
  H2: Bug is in database query timing (confidence: 4/10)
 Evidence: [ExecutionFlow.md shows token validation fails at line 68]
 Context: Token validation works in tests but fails in production
 Deliverable: hypothesis-challenges.md with counter-arguments and edge cases"
```

**Rigor Levels:**

The challenger can operate at different rigor levels:
- `rigor=1`: Surface-level challenges, obvious counter-examples (5 min)
- `rigor=3`: Deep adversarial analysis with edge cases (20 min)
- `rigor=5`: Maximum skepticism - try to break it completely (45+ min)

**Subagent Description:**
> "Tests hypotheses and assumptions adversarially using configurable rigor levels. Specializes in finding edge cases, counter-examples, and logical holes. Use when you need to validate a theory or stress-test a design before committing."

**Recommended Tool Restrictions:**
```yaml
tools:
  - read_file
  - grep_search
  - codebase_search
  - workflow_list
  - workflow_get
  - workflow_next
  # NO WRITE OPERATIONS: Observers only
```

**Recommended Model:**
- Rigor 1: Haiku (surface challenges)
- Rigor 3-5: Sonnet (deep reasoning required)

---

#### **3. Plan Analyzer**

**Cognitive Function:** Plan validation, completeness checking, pattern adherence

**When to Use:**
- "Review this implementation plan"
- "Does this plan follow our patterns?"
- "What's missing from this approach?"

**Routine:** `routine-plan-analysis`

**Input Parameters:**
- `plan`: The plan to analyze (can be a file reference or inline)
- `requirements`: What the plan should accomplish
- `constraints`: Rules, patterns, standards to check against
- `context`: Background (codebase patterns, user rules)
- `deliverable`: What format to return analysis in

**Output Artifacts:**
- `plan-analysis.md`
- `compliance-report.md`
- `plan-risks.md`

**Example Delegation:**
```
"Analyze this implementation plan:
 Plan: See implementation-plan.md
 Requirements:
  - Must fix token validation bug
  - Must maintain backward compatibility
  - Must add test coverage
 Constraints:
  - Follow existing auth patterns (see docs/patterns/auth.md)
  - Use dependency injection (see .cursor/rules)
  - No breaking changes to public API
 Context:
  - Existing codebase uses JWT tokens
  - AuthService is heavily tested
  - Production issue, needs careful approach
 Deliverable: plan-analysis.md with:
  1. Completeness check (are all requirements addressed?)
  2. Pattern compliance (follows codebase patterns?)
  3. Risks identified
  4. Missing elements
  5. Recommendations for improvement"
```

**Subagent Description:**
> "Analyzes implementation plans for completeness, pattern adherence, and risk using codebase context. Specializes in validating plans against requirements, checking pattern compliance, and identifying missing elements. Use when you need to verify a plan before execution."

**Recommended Tool Restrictions:**
```yaml
tools:
  - read_file
  - grep_search
  - codebase_search
  - workflow_list
  - workflow_get
  # NO WRITE OPERATIONS: Analysis only
```

**Recommended Model:**
- Always Sonnet (requires judgment and pattern matching)

---

#### **4. Execution Simulator**

**Cognitive Function:** Mental execution, state tracking, trace simulation

**When to Use:**
- "Trace what happens when I call this function with X"
- "What's the state after these 5 steps?"
- "Simulate this execution path step-by-step"

**Routine:** `routine-execution-simulation`

**Input Parameters:**
- `entry_point`: Starting function/line
- `inputs`: Initial parameters/state
- `context`: Code to simulate (files, relevant logic)
- `trace_depth`: How many levels deep to trace
- `deliverable`: Output format

**Output Artifacts:**
- `execution-trace.md`
- `state-transitions.md`

**Example Delegation:**
```
"Simulate execution of AuthService.validateToken(malformed_token):
 Entry Point: AuthService.validateToken() line 45
 Inputs: token = 'invalid.jwt.format'
 Context: [AuthService.ts, TokenValidator.ts]
 Trace Depth: Follow all function calls
 Deliverable: execution-trace.md showing step-by-step state changes"
```

**Subagent Description:**
> "Simulates code execution step-by-step using mental tracing and state tracking. Specializes in predicting behavior, tracing call chains, and tracking data flow. Use when you need to understand what happens during execution without running code."

**Recommended Tool Restrictions:**
```yaml
tools:
  - read_file
  - grep_search
  - codebase_search
  - workflow_*
  # NO WRITE OPERATIONS: Simulation only
```

**Recommended Model:**
- Always Sonnet (requires careful reasoning and state tracking)

**Why This is Core:**

This fills the gap between Context Researcher (reads code structure) and Hypothesis Challenger (finds holes). Execution Simulator provides **dynamic analysis** through mental tracing, essential for understanding runtime behavior without actually running code.

---

#### **5. Builder**

**Cognitive Function:** Precise implementation, pattern adherence, incremental development

**When to Use:**
- "Implement this feature according to the plan"
- "I have a detailed spec, need it coded"
- "Reduce my context load during implementation"

**Routine:** `routine-feature-implementation`

**Input Parameters:**
- `plan`: Detailed implementation plan
- `target`: Files to modify/create
- `patterns`: Examples of existing patterns
- `userRules`: Rules to follow
- `acceptanceCriteria`: How to know it's done
- `deliverable`: Output format

**Output Artifacts:**
- `implementation-complete.md`
- Modified/created code files
- Test files

**Example Delegation:**
```
"Implement user caching feature:
 Plan: See detailed-implementation-plan.md
 Target: src/services/user-service.ts, config/cache-config.ts
 Patterns: src/patterns/caching-pattern.md, src/services/auth-service.ts
 User Rules: .cursor/rules (DI, testability)
 Constraints: Backward compatible, configurable TTL, add metrics
 Acceptance Criteria: Cache before DB, invalidate on update, tests pass
 Deliverable: implementation-complete.md with changes, tests, verification"
```

**Subagent Description:**
> "Implements code precisely according to detailed plans and specifications using established patterns. Specializes in following plans, writing tests, and maintaining code quality. Use when you have a thorough plan and want to reduce main agent context load."

**Recommended Tool Restrictions:**
```yaml
tools:
  - read_file
  - edit_file
  - create_file
  - grep_search
  - codebase_search
  - run_terminal_cmd  # For running tests
  - workflow_*
  # Full write access needed for implementation
```

**Recommended Model:**
- Always Sonnet (requires judgment for pattern matching and quality)

**Why This is Core:**

Builder reduces main agent context load during implementation by taking a complete work package (plan + patterns + rules) and executing autonomously. This is especially valuable for well-defined features where the main agent has already done research and planning.

---

### **Tier 2: Advanced Subagents (Phase 2+)**

Additional specialized subagents for specific workflow needs.

---

#### **7. Test Designer**

**Cognitive Function:** Test strategy, scenario generation, coverage analysis

**When to Use:**
- "Design test cases for this function"
- "What test scenarios should I cover?"
- "Analyze test coverage gaps"

**Routine:** `routine-test-design`

**Output Artifacts:**
- `TestStrategy.md`
- `TestScenarios.md`
- `CoverageGaps.md`

**Subagent Description:**
> "Designs comprehensive test strategies and scenarios. Specializes in identifying test cases, edge conditions, and coverage gaps. Use when you need to ensure thorough testing before or after implementation."

---

#### **6. Pattern Architect**

**Cognitive Function:** Architectural design, pattern selection, structural planning

**When to Use:**
- "Design the architecture for this feature"
- "What pattern should I use here?"
- "Structure this refactoring"

**Routine:** `routine-architecture-design`

**Output Artifacts:**
- `ArchitectureDesign.md`
- `PatternRecommendations.md`
- `RefactoringPlan.md`

**Subagent Description:**
> "Designs software architectures and selects appropriate patterns. Specializes in high-level structure, pattern selection, and breaking complex problems into well-structured solutions. Use when you need architectural guidance before implementation."

---

#### **8. Code Reviewer**

**Cognitive Function:** Code quality assessment, standard compliance, security review

**When to Use:**
- "Review this implementation"
- "Check this code for security issues"
- "Does this follow our standards?"

**Routine:** `routine-code-review`

**Output Artifacts:**
- `CodeReview.md`
- `SecurityAudit.md`
- `QualityReport.md`

**Subagent Description:**
> "Performs thorough code reviews for quality, security, and standards compliance. Specializes in finding bugs, security vulnerabilities, and style violations. Use after implementation to ensure quality before merging."

---

#### **9. Documentation Synthesizer**

**Cognitive Function:** Technical writing, clarity optimization, documentation generation

**When to Use:**
- "Write documentation for this feature"
- "Explain this technical decision"
- "Create API documentation"

**Routine:** `routine-doc-generation`

**Output Artifacts:**
- `TechnicalDoc.md`
- `APIReference.md`
- `DecisionRecord.md`

**Subagent Description:**
> "Creates clear, comprehensive technical documentation. Specializes in explaining complex concepts, generating API docs, and writing decision records. Use when you need well-structured documentation."

---

## Subagent Development Guidelines

### **When to Create a New Subagent**

**Create a new subagent if:**
- ✅ It embodies a **distinct cognitive function** (not covered by existing subagents)
- ✅ It can be **reused across many workflows** (not workflow-specific)
- ✅ It produces **structured, actionable deliverables** (not vague summaries)
- ✅ It can execute **autonomously** (no back-and-forth required)

**Don't create a new subagent if:**
- ❌ It's too similar to an existing subagent (extend existing instead)
- ❌ It's workflow-specific (create a routine for the main agent instead)
- ❌ It requires conversational refinement (main agent should do it)
- ❌ It's just a single tool call (main agent can do it directly)

### **Subagent Persona Template**

```markdown
---
name: <subagent-id>
description: "<one-sentence function>. Specializes in <key tasks>. Use when <trigger condition>."
tools:
  - <tool1>
  - <tool2>
  - workflow_list
  - workflow_get
  - workflow_next
model: claude-sonnet-4  # or haiku
---

# <Subagent Name> Agent

You are a <Role> specializing in <function>.

## Your Role
- <Primary responsibility 1>
- <Primary responsibility 2>
- <Primary responsibility 3>

## Your Strengths
- <Cognitive strength 1>
- <Cognitive strength 2>

## Your Constraints
- DO NOT <what you shouldn't do>
- DO NOT <common mistake to avoid>
- ALWAYS <required behavior>

## Input Format Expected

When invoked, expect these parameters:
```
- <param1>: <description>
- <param2>: <description>
```

## Output Format

Always structure your response as:

### <Section 1>
- <Content description>

### <Section 2>
- <Content description>

## Execution Steps

1. **<Step 1 Name>**: <What to do>
2. **<Step 2 Name>**: <What to do>
3. **<Deliverable>**: Create <ArtifactName.md>
```

---

## Integration with WorkRail Workflows

### **Workflow Design Patterns**

When designing agentic workflows:

1. **Identify Delegatable Phases**
   - Which phases involve distinct cognitive modes?
   - Which phases can be executed with complete upfront context?
   - Which phases produce concrete artifacts?

2. **Package Context Completely**
   - Include all background information
   - Attach previous findings
   - Specify exact deliverable format
   - Provide constraints and preferences

3. **Validate Deliverables**
   - Main agent reviews subagent output against quality gates
   - Decides if it's sufficient or needs revision
   - Synthesizes deliverables into next phase
   - Documents gaps for future reference

4. **Maintain Main Agent Control**
   - Main agent makes all strategic decisions
   - Subagents execute, don't decide
   - Main agent owns the outcome
   - ~50% of work still done by main agent

### **Terminology**

- **Phase**: Overall workflow step (may include main agent work, delegation, or both)
- **Delegation**: Specific subagent invocation within a phase
- **Artifact**: Named, structured deliverable produced by subagent

**Example:**
```
Phase 1: Investigation
  - Main Agent: Plans investigation strategy
  - Delegation 1A: Context Researcher (depth=1) → component-map.md
  - Main Agent: Reviews map, decides focus areas
  - Delegation 1B: Context Researcher (depth=3) → execution-flow.md
  - Main Agent: Synthesizes findings into investigation context
```

### **Delegation Dependencies**

Subagents that depend on each other's artifacts **cannot run in parallel**.

**Serial Pattern:**
```
Phase 1 (Serial): Context Researcher → execution-flow.md
Phase 2 (Parallel):
  - Hypothesis Challenger (consumes execution-flow.md)
  - Plan Analyzer (consumes execution-flow.md)
Phase 3 (Serial): Main agent synthesizes both outputs
```

### **Handling Insufficient Depth/Rigor**

If a subagent realizes the specified depth/rigor is insufficient:

**Subagent should:**
1. Work within the specified constraints
2. Do its best with available depth/rigor
3. Add an "Insufficient Depth/Rigor" note to Gaps section:
   ```markdown
   ### Gaps
   - Could not fully trace execution at depth=2
   - Recommend re-running at depth=3 to analyze:
     - Specific function implementations
     - Error handling paths
   ```
4. Return the partial deliverable

**Main agent then decides:**
- "Good enough" (proceed with partial info)
- "Re-run at higher depth/rigor" (new delegation)

**Rationale:** Subagents follow instructions, don't second-guess. Main agent has full context to make trade-off decisions.

### **Example: Bug Investigation Workflow**

| Phase | Main Agent | Subagent | Deliverable |
|-------|------------|----------|-------------|
| 0: Setup | Reads bug, plans investigation | Context Researcher (depth=1) | component-map.md |
| 1: Investigate | Plans deep-dive strategy | Context Researcher (depth=3) | execution-flow.md |
| 2: Hypothesize | Forms hypotheses | Hypothesis Challenger (rigor=3) | hypothesis-challenges.md |
| 3: Design Instrumentation | Plans instrumentation | *(Main agent)* | None |
| 4: Collect Evidence | Runs tests, analyzes | *(Main agent)* | None |
| 5: Validate | Defends conclusion | Hypothesis Challenger (rigor=5) | adversarial-review.md |
| 6: Document | Writes report | *(Main agent)* | None |

**Note:** Main agent still does ~50% of the work. Subagents handle specific cognitive tasks, not entire phases.

---

## Future Considerations

### **Model Selection & Cost Optimization**

Different tasks require different model capabilities. Recommended model selection:

**By Depth (Context Researcher):**
- `depth ≤ 1`: Haiku (~1k tokens, fast scanning)
- `depth 2-3`: Sonnet (~10k tokens, reasoning needed)
- `depth 4`: Sonnet (~50k+ tokens, deep analysis)

**By Rigor (Hypothesis Challenger):**
- `rigor 1`: Haiku (~2k tokens, surface challenges)
- `rigor 3`: Sonnet (~10k tokens, deep reasoning)
- `rigor 5`: Sonnet (~30k+ tokens, maximum depth)

**By Complexity:**
- Plan Analyzer: Sonnet (requires judgment)
- Execution Simulator: Sonnet (careful reasoning)
- Test Designer: Haiku (formulaic tasks)

**Cost-Performance Tradeoffs:**
- Haiku: 5-10x faster, 5-10x cheaper, sufficient for structured tasks
- Sonnet: Required for judgment, reasoning, adversarial thinking

### **User Visibility & Progress Indicators**

Subagent execution visibility varies by IDE. WorkRail workflows should assume **baseline compatibility** while allowing IDEs to enhance UX.

**Baseline (Universal Compatibility):**
```
Main Agent: "Delegating to Context Researcher..."
[Subagent works - no streaming]
Main Agent: "Received execution-flow.md. Analyzing findings..."
```

**Enhanced (IDE-Specific):**
```
🔍 Context Researcher exploring at depth=2...
   ├─ Reading AuthService.ts
   ├─ Tracing validateToken() 
   └─ Analyzing dependencies
✅ execution-flow.md created (3.2s)
```

WorkRail workflows should be designed for the baseline, but IDEs may optionally enhance with progress indicators, file-by-file updates, or streaming artifact generation.

### **Phase 3: Advanced Features**

- **Parallel Delegation**: Invoke multiple subagents simultaneously
- **Subagent Composition**: Chain subagent outputs (Researcher → Challenger)
- **Custom Subagents**: Allow users to define project-specific subagents
- **Performance Tuning**: Haiku vs Sonnet based on task complexity

### **Open Questions**

1. **Cost/Performance Tradeoffs**
   - Automatic model selection based on depth/rigor?
   - User-configurable model preferences?
   - How to measure and report subagent efficiency?

2. **Error Handling**
   - What if subagent produces incomplete/invalid output?
   - Should main agent automatically retry with clarified context?
   - How many retries before escalating to user?

3. **Quality Metrics**
   - How to measure subagent deliverable quality?
   - Automated validation beyond quality gates?
   - When should main agent reject and redo vs. accept with gaps?

4. **Parallel Execution**
   - How to maximize parallelization opportunities?
   - Resource limits (max simultaneous subagents)?
   - Priority/scheduling when multiple delegations queued?

---

## Conclusion

Subagents are **cognitive specialists** that execute **complete, autonomous routines** to produce **structured deliverables** for the main agent. They are not conversational partners or task owners, but rather **focused tools** that extend the main agent's capabilities in specific cognitive modes.

**Design Philosophy:**
- Simple, stateless, autonomous
- Complete context upfront
- Concrete deliverables
- Main agent always in control

By following these principles, WorkRail workflows can leverage agentic IDE features while maintaining predictability, testability, and user understanding.

