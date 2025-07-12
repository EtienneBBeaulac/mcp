# agentRole Field Design Specification

## Overview
This document specifies the design and behavior of the new optional `agentRole` field in workflow steps, clarifying its purpose and distinction from the existing `prompt` field.

## Field Purpose & Semantic Differences

### `prompt` Field (Existing)
- **Purpose**: User-facing content that describes what the user should do or understand
- **Audience**: Human users executing the workflow
- **Content**: Instructions, questions, explanations, and information for users
- **Processing**: Displayed directly to users as part of the workflow step
- **Example**: "Please provide the requirements for your new feature. Include user stories, acceptance criteria, and any technical constraints."

### `agentRole` Field (New)
- **Purpose**: Agent behavioral instructions that define how the AI should behave and approach the task
- **Audience**: AI agents executing the workflow step
- **Content**: Meta-instructions about persona, strategy, interaction style, and behavioral constraints
- **Processing**: Used by agents as system-level behavioral guidance, not shown to users
- **Example**: "Act as a requirements analyst. Ask clarifying questions one at a time, wait for responses, and probe for missing details. Be thorough but not overwhelming."

## Key Distinctions

| Aspect | `prompt` | `agentRole` |
|--------|----------|-------------|
| **Visibility** | User-facing, displayed in UI | Agent-only, hidden from users |
| **Content Type** | Task instructions and information | Behavioral and strategic guidance |
| **Processing** | Direct display to user | System-level instruction to agent |
| **Interaction** | What the user should do | How the agent should behave |
| **Example Use** | "Create a new feature specification" | "Act as a technical architect and guide the user through systematic analysis" |

## Processing Specification

### Current Processing (without agentRole)
```typescript
// Current logic in workflow-service.ts
if (nextStep.guidance && nextStep.guidance.length > 0) {
  const guidanceHeader = '## Step Guidance';
  const guidanceList = nextStep.guidance.map((g: string) => `- ${g}`).join('\n');
  stepGuidance = `${guidanceHeader}\n${guidanceList}\n\n`;
}
finalPrompt = `${stepGuidance}${nextStep.prompt}`;
```

### Enhanced Processing (with agentRole)
```typescript
// New logic to be implemented
let systemInstructions = '';
let userContent = '';
let stepGuidance = '';

// Process agentRole as system-level instructions
if (nextStep.agentRole) {
  systemInstructions = `## Agent Role\n${nextStep.agentRole}\n\n`;
}

// Process guidance as tactical hints (unchanged)
if (nextStep.guidance && nextStep.guidance.length > 0) {
  const guidanceHeader = '## Step Guidance';
  const guidanceList = nextStep.guidance.map((g: string) => `- ${g}`).join('\n');
  stepGuidance = `${guidanceHeader}\n${guidanceList}\n\n`;
}

// User-facing prompt content
userContent = nextStep.prompt;

// Final composition: System instructions + Tactical guidance + User content
finalPrompt = `${systemInstructions}${stepGuidance}${userContent}`;
```

## Field Validation Constraints

### `agentRole` Validation Rules
- **Type**: String
- **Required**: No (optional field)
- **Max Length**: 1024 characters
- **Min Length**: 10 characters (if provided)
- **Format**: Free text, but should contain behavioral instructions
- **Pattern**: No specific pattern required

### JSON Schema Addition
```json
{
  "agentRole": {
    "type": "string",
    "description": "Optional behavioral instructions for AI agents defining how they should approach and execute this step. This content is not shown to users.",
    "minLength": 10,
    "maxLength": 1024
  }
}
```

## MCP Tool Interface Impact

### `workflow_next` Tool Output Format
When `agentRole` is present, the tool output will include it in the guidance structure:

```json
{
  "step": {
    "id": "example-step",
    "title": "Example Step",
    "prompt": "User-facing instructions...",
    "agentRole": "Agent behavioral instructions...",
    "guidance": ["Tactical hint 1", "Tactical hint 2"]
  },
  "guidance": {
    "prompt": "## Agent Role\nAgent behavioral instructions...\n\n## Step Guidance\n- Tactical hint 1\n- Tactical hint 2\n\nUser-facing instructions..."
  },
  "isComplete": false
}
```

## Migration Strategy for Existing Workflows

### Backward Compatibility
- All existing workflows continue to work unchanged
- No modification required for existing workflow files
- `agentRole` is optional and defaults to undefined/null

### Best Practices for New Workflows
1. Use `prompt` for user-facing content only
2. Use `agentRole` for agent behavioral instructions
3. Use `guidance` for tactical hints and tips
4. Avoid mixing agent instructions in `prompt` field

### Example Migration
**Before (mixed content in prompt):**
```json
{
  "prompt": "**Agent's Role:** Act as a code reviewer. Ask specific questions about the code quality.\n\nPlease review the attached code and provide feedback on potential improvements."
}
```

**After (separated concerns):**
```json
{
  "prompt": "Please review the attached code and provide feedback on potential improvements.",
  "agentRole": "Act as a code reviewer. Ask specific questions about the code quality, focusing on maintainability, performance, and best practices."
}
```

## Implementation Phases

1. **Schema Updates**: Add `agentRole` to JSON Schema with validation constraints
2. **Type Definitions**: Update TypeScript interfaces in both type files
3. **Validation Layer**: Update Zod schemas and validation logic
4. **Processing Logic**: Implement enhanced prompt composition in workflow service
5. **Testing**: Comprehensive test coverage for new functionality
6. **Documentation**: Update API documentation and workflow authoring guides

## Quality Gates

- [ ] `agentRole` content is never displayed to users
- [ ] Agent instructions are clearly separated from user content
- [ ] Backward compatibility is maintained for all existing workflows
- [ ] Validation prevents invalid `agentRole` content
- [ ] Processing logic handles missing `agentRole` gracefully
- [ ] MCP tools expose `agentRole` appropriately to consuming agents

## Risk Mitigation

1. **Content Confusion**: Clear documentation and examples prevent misuse
2. **Processing Errors**: Graceful handling of missing or invalid `agentRole`
3. **Validation Sync**: Automated tests ensure schema consistency across layers
4. **Performance Impact**: Minimal processing overhead with efficient string composition 