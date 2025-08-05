# WorkRail: Guided Workflow Orchestration for AI Agents

> **Transform chaotic AI interactions into structured, reliable workflows**

[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)]()

---

## 🤔 The Problem

AI agents are incredibly powerful but often:
- **Hallucinate** solutions without proper analysis
- **Lose context** in complex, multi-step tasks  
- **Skip critical steps** like testing or validation
- **Make unsafe changes** without proper review processes

## 💡 The Solution

WorkRail provides **structured, step-by-step workflows** that guide AI agents through complex tasks safely and reliably. Instead of letting AI "wing it," workflows ensure:

- ✅ **Systematic approach** - Every critical step is covered
- ✅ **Quality gates** - Built-in validation and review points  
- ✅ **Repeatable processes** - Consistent results across tasks
- ✅ **Safety guardrails** - Prevent dangerous or incomplete work

---

## 🛠️ MCP Tools

WorkRail exposes 5 core tools through the Model Context Protocol:

- **`workflow_list`** - Browse available workflows for different task types
- **`workflow_get`** - Get complete workflow details and requirements  
- **`workflow_next`** - Get the next step in an active workflow
- **`workflow_validate`** - Validate step outputs against quality criteria
- **`workflow_validate_json`** - Validate and lint workflow JSON files

---

## ⚙️ Installation

Add WorkRail to your AI agent by configuring the MCP server:

### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "workrail": {
      "command": "npx",
      "args": ["-y", "@exaudeus/workrail"]
    }
  }
}
```

### Other MCP Clients
Use the same command pattern: `npx -y @exaudeus/workrail`

---

## 📋 Available Workflows

WorkRail comes with battle-tested workflows for common development tasks:

### 🔧 **Development Workflows**
- **`coding-task-workflow`** - Comprehensive coding workflow with analysis, planning, implementation, and review
- **`coding-task-workflow-with-loops`** - Enhanced version with iterative refinement loops
- **`systemic-bug-investigation`** - Systematic debugging methodology that prevents jumping to conclusions

### 🚀 **Project Management**  
- **`adaptive-ticket-creation`** - Create well-structured tickets with proper requirements
- **`mr-review-workflow`** - Thorough merge request review process

### 📚 **Content & Documentation**
- **`document-creation-workflow`** - Structured approach to creating comprehensive documentation
- **`presentation-creation`** - Build engaging presentations with clear narrative flow
- **`learner-centered-course-workflow`** - Design educational content with learning objectives

### 🔍 **Discovery & Analysis**
- **`exploration-workflow`** - Systematic codebase or domain exploration
- **`workflow-for-workflows`** - Meta-workflow for designing new workflows

---

## 🔄 Loop Support

WorkRail supports powerful iteration patterns for complex tasks:

- **`while`** - Continue while a condition is true
- **`until`** - Continue until a condition is met  
- **`for`** - Execute a fixed number of times
- **`forEach`** - Process items in an array

Perfect for batch operations, retries, polling, and iterative refinement.

---

## 📖 Quick Example

Here's what a workflow step looks like:

```json
{
  "id": "analyze-codebase",
  "name": "Deep Codebase Analysis",
  "description": "Understand the codebase structure before making changes",
  "agentRole": "You are a senior engineer performing careful code analysis",
  "runCondition": {
    "type": "context",
    "key": "taskComplexity", 
    "operator": "in",
    "values": ["Medium", "Large"]
  },
  "validationCriteria": {
    "outputLength": {"min": 200, "max": 2000},
    "mustContain": ["file structure", "key components", "dependencies"]
  }
}
```

The agent receives structured guidance on **what to do**, **how to do it**, and **quality standards to meet**.

---

## 🌟 Why Choose WorkRail?

| Without WorkRail | With WorkRail |
|------------------|---------------|
| "Just fix this bug" → agent makes random changes | Systematic investigation → evidence-based diagnosis → targeted fix |
| "Add a feature" → incomplete implementation | Analysis → planning → implementation → testing → review |
| Inconsistent quality across tasks | Repeatable, high-quality processes |
| Context lost in long conversations | Structured progression with validation gates |

---

## 🚀 Getting Started

1. **Install** WorkRail as an MCP server (see installation above)
2. **Browse workflows** - Use `workflow_list` to see available options
3. **Start a workflow** - Use `workflow_get` to load a workflow for your task  
4. **Follow the steps** - Use `workflow_next` to get guided, step-by-step instructions
5. **Validate progress** - Use `workflow_validate` to ensure quality at each step

---

## 📄 License

MIT License - see [LICENSE](LICENSE)