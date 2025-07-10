# MCP Tool API Specification v1.0

This document formally specifies the JSON-RPC 2.0 API for the Workflow Orchestration System's
`workflowlookup` MCP server.

> **Note**: This document focuses on the workflow-specific tools. For complete MCP protocol compliance including server initialization, tool discovery, and handshake procedures, see [MCP Protocol Handshake Specification](mcp-protocol-handshake.md).

## JSON-RPC 2.0 Base Protocol

All communication follows the [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification).

### Request Structure

Every request to the MCP server must conform to this structure:

```json
{
  "jsonrpc": "2.0",
  "id": number | string,
  "method": string,
  "params": object | array | null
}
```

- `jsonrpc`: Must always be `"2.0"`
- `id`: Unique identifier for the request (number or string)
- `method`: The name of the tool being invoked
- `params`: Parameters specific to the tool (can be object, array, or null)

### Response Structure

#### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": number | string,
  "result": any
}
```

- `jsonrpc`: Always `"2.0"`
- `id`: Must match the request ID
- `result`: The tool's return value (structure depends on the tool)

#### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": number | string | null,
  "error": {
    "code": number,
    "message": string,
    "data": any
  }
}
```

- `jsonrpc`: Always `"2.0"`
- `id`: Matches request ID, or null if error occurred before ID could be determined
- `error`: Error object containing:
    - `code`: Numeric error code
    - `message`: Human-readable error message
    - `data`: Optional additional error information

### Standard Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON was received |
| -32600 | Invalid Request | The JSON sent is not a valid Request object |
| -32601 | Method not found | The method does not exist |
| -32602 | Invalid params | Invalid method parameter(s) |
| -32603 | Internal error | Internal JSON-RPC error |
| -32001 | Workflow not found | The specified workflow ID does not exist |
| -32002 | Invalid workflow | The workflow file is malformed or invalid |
| -32003 | Step not found | The specified step ID does not exist in the workflow |

## Tool Specifications

The `workflowlookup` server exposes the following tools:

### workflow_list

Lists all available workflows.

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "workflow_list",
  "params": null
}
```

#### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "workflows": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "category": "string",
        "version": "string"
      }
    ]
  }
}
```

#### Field Descriptions

- `workflows`: Array of workflow summaries
    - `id`: Unique workflow identifier (matches workflow schema pattern)
    - `name`: Human-friendly workflow name
    - `description`: Brief description of what the workflow accomplishes
    - `category`: Workflow category (e.g., "development", "review", "documentation")
    - `version`: Workflow version following semantic versioning

### workflow_get

Retrieves a specific workflow by ID.

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "workflow_get",
  "params": {
    "id": "string"
  }
}
```

#### Parameters

- `id` (required): The workflow ID to retrieve

#### Response

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "id": "string",
    "name": "string",
    "description": "string",
    "preconditions": ["string"],
    "clarificationPrompts": ["string"],
    "steps": [
      {
        "id": "string",
        "title": "string",
        "prompt": "string",
        "askForFiles": boolean,
        "requireConfirmation": boolean
      }
    ],
    "metaGuidance": ["string"]
  }
}
```

The returned workflow object must validate against the `workflow.schema.json` specification.

#### Error Cases

- Returns error code `-32001` if workflow ID not found
- Returns error code `-32002` if workflow file is malformed

### workflow_next

Gets the next step guidance based on workflow state.

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "workflow_next",
  "params": {
    "workflowId": "string",
    "currentStep": "string",
    "completedSteps": ["string"],
    "context": {}
  }
}
```

#### Parameters

- `workflowId` (required): The workflow being executed
- `currentStep` (optional): The ID of the current step
- `completedSteps` (required): Array of step IDs that have been completed
- `context` (optional): Opaque context object passed through for state management

#### Response

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "step": {
      "id": "string",
      "title": "string",
      "prompt": "string",
      "askForFiles": boolean,
      "requireConfirmation": boolean
    },
    "guidance": {
      "prompt": "string",
      "modelHint": "string",
      "requiresConfirmation": boolean,
      "validationCriteria": ["string"]
    },
    "isComplete": boolean
  }
}
```

#### Field Descriptions

- `step`: The next step to execute (null if workflow is complete)
- `guidance`: Additional orchestration guidance
    - `prompt`: Enhanced prompt with context
    - `modelHint`: Suggested model type (e.g., "model-with-strong-reasoning")
    - `requiresConfirmation`: Whether user confirmation is needed
    - `validationCriteria`: List of criteria to validate completion
- `isComplete`: True if all workflow steps are completed

#### Error Cases

- Returns error code `-32001` if workflow ID not found
- Returns error code `-32003` if current step ID not found in workflow

### workflow_validate

Validates the output of a workflow step.

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "workflow_validate",
  "params": {
    "workflowId": "string",
    "stepId": "string",
    "output": "string"
  }
}
```

#### Parameters

- `workflowId` (required): The workflow being executed
- `stepId` (required): The step ID being validated
- `output` (required): The output to validate

#### Response

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "valid": boolean,
    "issues": ["string"],
    "suggestions": ["string"]
  }
}
```

#### Field Descriptions

- `valid`: Whether the output meets validation criteria
- `issues`: List of validation problems found
- `suggestions`: List of suggestions for improvement

#### Error Cases

- Returns error code `-32001` if workflow ID not found
- Returns error code `-32003` if step ID not found in workflow

## Example Session

Here's a complete example session showing tool usage:

### 1. List Available Workflows

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "list-1",
  "method": "workflow_list",
  "params": null
}

// Response
{
  "jsonrpc": "2.0",
  "id": "list-1",
  "result": {
    "workflows": [
      {
        "id": "ai-task-implementation",
        "name": "AI Task Prompt Workflow",
        "description": "Guides through task understanding → planning → implementation → verification",
        "category": "development",
        "version": "1.0.0"
      }
    ]
  }
}
```

### 2. Get Workflow Details

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "get-1",
  "method": "workflow_get",
  "params": {
    "id": "ai-task-implementation"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "get-1",
  "result": {
    "id": "ai-task-implementation",
    "name": "AI Task Prompt Workflow",
    "description": "Complete task implementation with verification",
    "preconditions": [
      "Task description is clear and complete"
    ],
    "steps": [
      {
        "id": "understand",
        "title": "Deep understanding of task and codebase",
        "prompt": "Analyze the task description...",
        "requireConfirmation": true
      }
    ]
  }
}
```

### 3. Get Next Step

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "next-1",
  "method": "workflow_next",
  "params": {
    "workflowId": "ai-task-implementation",
    "completedSteps": [],
    "context": {"taskId": "TASK-123"}
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "next-1",
  "result": {
    "step": {
      "id": "understand",
      "title": "Deep understanding of task and codebase",
      "prompt": "Analyze the task description...",
      "requireConfirmation": true
    },
    "guidance": {
      "prompt": "First, let's understand the task thoroughly. Analyze the task description...",
      "modelHint": "model-with-strong-reasoning",
      "requiresConfirmation": true,
      "validationCriteria": [
        "Clear understanding of requirements",
        "Identified affected files",
        "Documented assumptions"
      ]
    },
    "isComplete": false
  }
}
```

### 4. Error Example

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "error-1",
  "method": "workflow_get",
  "params": {
    "id": "non-existent-workflow"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "error-1",
  "error": {
    "code": -32001,
    "message": "Workflow not found",
    "data": {
      "workflowId": "non-existent-workflow"
    }
  }
}
```
