# WorkRail: Guided Workflow Orchestration for AI Agents

WorkRail is an MCP-compatible orchestration engine designed to guide AI agents through complex, multi-step tasks using structured JSON workflows. It provides a framework for creating reliable, repeatable, and testable processes that enhance the capabilities of coding agents beyond simple, stateless tool calls.

The core of the system is the **workflow file**, a JSON document that defines the sequence of steps, logic, and guardrails for a given task. These workflows are source-controllable, shareable, and can be loaded from multiple sources (project-local, user-global, or bundled with the tool).

---

### Key Capabilities

WorkRail's workflow schema (`spec/workflow.schema.json`) provides a rich set of features for fine-grained control over the agent's execution path:

*   **Conditional Logic (`runCondition`):** Define conditions under which a step should be executed or skipped. This allows for dynamic, branching workflows that can adapt based on context variables set during execution. For example, a "Deep Codebase Analysis" step can be configured to run only if a `taskComplexity` variable is set to 'Large'.

*   **Step Output Validation (`validationCriteria`):** Enforce quality and correctness at each step by validating the agent's output. The engine supports rules for regex matching, length constraints, and even validation against a nested JSON schema.

*   **Agent Personas (`agentRole`):** Provide specific behavioral instructions to the agent for individual steps. This allows you to guide the agent's approach, such as instructing it to act as a "skeptical senior engineer" when reviewing a technical plan.

*   **Human-in-the-Loop (`requireConfirmation`):** Configure critical steps to pause and wait for explicit human approval before proceeding, creating a balance between automation and oversight.

---

### Example Workflow: A Structured Coding Task

As a practical example, a workflow for a typical coding task could be defined to guide an agent through a professional development process. Such a workflow could include phases for:

1.  **Intelligent Triage:** Assessing task complexity.
2.  **Deep Codebase Analysis:** Understanding the code before making changes.
3.  **Informed Clarification:** Asking targeted questions based on its analysis.
4.  **Specification & Design:** Generating formal planning documents.
5.  **Devil's Advocate Review:** Critiquing its own implementation plan.
6.  **Iterative Implementation & Verification:** Executing the plan with built-in tests.

---

### MCP Interface

WorkRail exposes the following MCP tools for agent interaction:

*   `workflow_list`: Discover available workflows.
*   `workflow_get`: Fetch a workflow's metadata or a full preview.
*   `workflow_next`: Get the next step's instructions, guidance, and conditions.
*   `workflow_validate`: Validate the output of a step against its defined criteria.
*   `workflow_validate_json`: Lint a complete workflow file for schema compliance.

---

### Agent Integration

WorkRail is designed to be launched by an MCP-compatible host environment. You don't typically run `workrail start` and connect to it; instead, you configure your agent's environment to execute the `workrail` command. The host manages the server's lifecycle and communicates with it over `stdin`/`stdout`.

A typical MCP host configuration looks like this:

```json
{
  "mcpServers": {
    "workrail-server": {
      "command": "npx",
      "args": [
        "-y",
        "@exaudeus/workrail@^0"
      ]
    }
  }
}
```

### Command-Line Utilities

The `workrail` command also provides utilities for managing workflows outside of an agent session:

```bash
# Install the CLI for local use
npm install -g @exaudeus/workrail

# Initialize your personal workflow directory (~/.workrail/workflows)
workrail init

# List all available workflows from all sources
workrail list

# Validate a custom workflow file
workrail validate ./path/to/my-workflow.json
```

---

### Architecture
WorkRail is built on a **Clean Architecture**, decoupling the core domain logic from the MCP transport layer. This design promotes testability, maintainability, and extensibility. 