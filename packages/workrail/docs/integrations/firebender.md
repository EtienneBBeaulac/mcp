# Firebender Integration Guide

## Overview
Firebender is an Agentic IDE that supports multiple subagents. WorkRail works seamlessly with Firebender in two modes: **Delegation** (Gold) and **Proxy** (Silver).

## Configuration Rules

Firebender has a specific behavior regarding Tool Access that you must understand to enable **Delegation Mode**.

### The "Inheritance" Rule (Recommended)
If you define a subagent **without** a `tools` configuration block, it inherits **ALL** tools from the main agent, including WorkRail.

**✅ Recommended Config (Tier 3 Enabled):**
```json
{
  "subagents": {
    "researcher": {
      "systemPrompt": "You are a Researcher...",
      // No "tools" block -> Inherits everything!
    }
  }
}
```

### The "Whitelist" Pitfall
If you define a `tools` block (even if empty), the subagent loses access to everything except what is listed.

**❌ Broken Config (Tier 2 Only):**
```json
{
  "subagents": {
    "researcher": {
      "systemPrompt": "...",
      "tools": ["read_file", "grep"] // Missing WorkRail tools!
    }
  }
}
```

**✅ Fixed Whitelist Config:**
If you MUST whitelist tools, you must explicitly add the WorkRail suite:
```json
{
  "subagents": {
    "researcher": {
      "systemPrompt": "...",
      "tools": [
        "read_file", 
        "grep",
        "workflow_list",
        "workflow_get",
        "workflow_next",
        "workflow_validate"
      ]
    }
  }
}
```

## Verifying Your Setup
Run the Diagnostic Workflow to test your configuration:
1.  Start a chat with the Main Agent.
2.  Ask: "Run the environment diagnostic workflow."
3.  Follow the steps to probe your subagent's capabilities.

