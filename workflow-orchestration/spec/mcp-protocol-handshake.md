# MCP Protocol Specification for Workflow Orchestration

> 🤝 **Model Context Protocol Implementation for Workflow Orchestration System**

[![Status](https://img.shields.io/badge/status-specification-orange.svg)](https://github.com/yourusername/workflow-orchestration-system)
[![MCP Version](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.org)
[![Protocol](https://img.shields.io/badge/protocol-JSON--RPC%202.0-green.svg)](https://www.jsonrpc.org/specification)

---

## Purpose & Scope

This specification defines the MCP (Model Context Protocol) handshake and initialization protocol for the Workflow Orchestration System's `workflowlookup` server. It covers server initialization, tool discovery, error handling, communication framing, and lifecycle requirements for MCP-compliant servers and clients.

This document is normative for all implementations of the workflowlookup MCP server and any client wishing to interoperate with it.

## Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

---

## Overview

This document specifies the MCP (Model Context Protocol) implementation for the workflowlookup server. The server follows the MCP standard for server initialization, tool discovery, and communication.

**Protocol Version**: `2024-11-05`  
**Base Protocol**: JSON-RPC 2.0  
**Transport**: stdio (standard input/output)  
**Encoding**: UTF-8  
**Framing**: Newline-delimited JSON messages (one message per line)

## Server Initialization

### Initialize Request

The client must send an `initialize` request to establish the connection:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

**Parameters:**
- `protocolVersion` (required): MCP protocol version being used
- `capabilities` (required): Client capabilities object
- `clientInfo` (optional): Client information
  - `name`: Client name (e.g., "claude-desktop", "firebender")
  - `version`: Client version string

### Initialize Response

The server responds with its capabilities and information:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": false,
        "notifyProgress": false
      },
      "resources": {
        "listChanged": false
      }
    },
    "serverInfo": {
      "name": "workflowlookup",
      "version": "1.0.0",
      "description": "Workflow Orchestration System MCP Server"
    }
  }
}
```

**Response Fields:**
- `protocolVersion`: Confirms the protocol version being used
- `capabilities`: Server capabilities
  - `tools.listChanged`: Whether server supports tool list change notifications
  - `tools.notifyProgress`: Whether server supports progress notifications
  - `resources.listChanged`: Whether server supports resource list change notifications
- `serverInfo`: Information about the server
  - `name`: Server name identifier
  - `version`: Server version following semantic versioning
  - `description`: Human-readable server description

### Initialize Error Cases

```json
// Unsupported protocol version
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Unsupported protocol version",
    "data": {
      "supportedVersions": ["2024-11-05"],
      "requestedVersion": "2024-10-01"
    }
  }
}

// Invalid initialization parameters
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "protocolVersion is required"
    }
  }
}
```

## Tool Discovery

### Tools List Request

After successful initialization, the client requests available tools:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

### Tools List Response

The server responds with all available tools, their schemas, and metadata:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "workflow_list",
        "description": "Lists all available workflows",
        "inputSchema": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "outputSchema": {
          "type": "object",
          "properties": {
            "workflows": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {"type": "string"},
                  "name": {"type": "string"},
                  "description": {"type": "string"},
                  "category": {"type": "string"},
                  "version": {"type": "string"}
                },
                "required": ["id", "name", "description", "category", "version"]
              }
            }
          },
          "required": ["workflows"]
        },
        "examples": {
          "request": {"method": "workflow_list", "params": {}},
          "response": {"workflows": [{"id": "ai-task-implementation", "name": "AI Task Prompt Workflow", "description": "Guides through task understanding → planning → implementation → verification", "category": "development", "version": "1.0.0"}]}
        }
      },
      {
        "name": "workflow_get",
        "description": "Retrieves a specific workflow by ID",
        "inputSchema": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "description": "The workflow ID to retrieve",
              "pattern": "^[a-z0-9-]+$",
              "minLength": 3,
              "maxLength": 64
            }
          },
          "required": ["id"],
          "additionalProperties": false
        },
        "outputSchema": {
          "$ref": "workflow.schema.json"
        },
        "examples": {
          "request": {"method": "workflow_get", "params": {"id": "ai-task-implementation"}},
          "response": {"id": "ai-task-implementation", "name": "AI Task Prompt Workflow", "description": "Complete task implementation with verification", "preconditions": ["Task description is clear and complete"], "steps": [{"id": "understand", "title": "Deep understanding of task and codebase", "prompt": "Analyze the task description...", "requireConfirmation": true}]}
        }
      },
      {
        "name": "workflow_next",
        "description": "Gets the next step guidance based on workflow state",
        "inputSchema": {
          "type": "object",
          "properties": {
            "workflowId": {
              "type": "string",
              "description": "The workflow ID",
              "pattern": "^[a-z0-9-]+$",
              "minLength": 3,
              "maxLength": 64
            },
            "currentStep": {
              "type": "string",
              "description": "Current step ID (optional)",
              "pattern": "^[a-z0-9-]+$",
              "minLength": 3,
              "maxLength": 64
            },
            "completedSteps": {
              "type": "array",
              "description": "Array of completed step IDs",
              "items": {"type": "string", "pattern": "^[a-z0-9-]+$"},
              "uniqueItems": true
            },
            "context": {
              "type": "object",
              "description": "Additional context for step guidance",
              "additionalProperties": true
            }
          },
          "required": ["workflowId", "completedSteps"],
          "additionalProperties": false
        },
        "outputSchema": {
          "type": "object",
          "properties": {
            "step": {"type": "object"},
            "guidance": {"type": "object"},
            "isComplete": {"type": "boolean"}
          },
          "required": ["step", "guidance", "isComplete"]
        },
        "examples": {
          "request": {"method": "workflow_next", "params": {"workflowId": "ai-task-implementation", "completedSteps": [], "context": {"taskId": "TASK-123"}}},
          "response": {"step": {"id": "understand", "title": "Understand the task", "prompt": "Analyze the requirements..."}, "guidance": {"prompt": "PREP: ... IMPLEMENT: ... VERIFY: ..."}, "isComplete": false}
        }
      },
      {
        "name": "workflow_validate",
        "description": "Validates step output against workflow requirements",
        "inputSchema": {
          "type": "object",
          "properties": {
            "workflowId": {
              "type": "string",
              "description": "The workflow ID",
              "pattern": "^[a-z0-9-]+$",
              "minLength": 3,
              "maxLength": 64
            },
            "stepId": {
              "type": "string",
              "description": "The step ID to validate",
              "pattern": "^[a-z0-9-]+$",
              "minLength": 3,
              "maxLength": 64
            },
            "output": {
              "type": "string",
              "description": "The step output to validate",
              "minLength": 1
            }
          },
          "required": ["workflowId", "stepId", "output"],
          "additionalProperties": false
        },
        "outputSchema": {
          "type": "object",
          "properties": {
            "valid": {"type": "boolean"},
            "issues": {"type": "array", "items": {"type": "string"}},
            "suggestions": {"type": "array", "items": {"type": "string"}}
          },
          "required": ["valid"]
        },
        "examples": {
          "request": {"method": "workflow_validate", "params": {"workflowId": "ai-task-implementation", "stepId": "understand", "output": "I have analyzed the requirements."}},
          "response": {"valid": true, "issues": [], "suggestions": []}
        }
      }
    ]
  }
}
```

## Error Handling

### MCP Standard Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON was received |
| -32600 | Invalid Request | The JSON sent is not a valid Request object |
| -32601 | Method not found | The method does not exist |
| -32602 | Invalid params | Invalid method parameter(s) |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 | Server error | Server-specific error |
| -32001 | Workflow not found | The specified workflow ID does not exist |
| -32002 | Invalid workflow | The workflow file is malformed or invalid |
| -32003 | Step not found | The specified step ID does not exist |

### Error Response Format

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

### Error Response Examples

```json
// Parse error
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32700,
    "message": "Parse error",
    "data": {"details": "Unexpected token in JSON"}
  }
}

// Method not found
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": {"method": "non_existent_tool"}
  }
}

// Invalid params
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {"details": "workflowId is required"}
  }
}

// Workflow not found
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32001,
    "message": "Workflow not found",
    "data": {"workflowId": "nonexistent-workflow"}
  }
}

// Step not found
{
  "jsonrpc": "2.0",
  "id": 6,
  "error": {
    "code": -32003,
    "message": "Step not found",
    "data": {"stepId": "nonexistent-step"}
  }
}
```

## Communication Protocol

- **Encoding**: UTF-8
- **Framing**: One JSON-RPC message per line (newline-delimited)
- **Transport**: stdio (stdin/stdout)
- **Buffering**: Each message must be a single line, no embedded newlines
- **Order**: Messages must be processed in the order received

## Server Lifecycle

### Startup
- Server starts and waits for `initialize` request
- No tool calls are processed before initialization

### Shutdown
- Server should implement a `shutdown` method:

```json
{
  "jsonrpc": "2.0",
  "id": 99,
  "method": "shutdown",
  "params": {}
}
```

- Server responds with:

```json
{
  "jsonrpc": "2.0",
  "id": 99,
  "result": null
}
```

- After responding, the server should exit gracefully

### Keepalive/Heartbeat
- Not required for stdio transport, but server should handle long periods of inactivity gracefully

### Error Recovery
- On fatal error, server should emit an error response and exit with nonzero status
- On recoverable error, server should emit an error response and continue processing

## Complete Handshake Example

```json
// 1. Client sends initialize request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "clientInfo": {"name": "claude-desktop", "version": "1.0.0"}
  }
}

// 2. Server responds with capabilities
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {"listChanged": false, "notifyProgress": false}, "resources": {"listChanged": false}},
    "serverInfo": {"name": "workflowlookup", "version": "1.0.0", "description": "Workflow Orchestration System MCP Server"}
  }
}

// 3. Client requests tool list
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}

// 4. Server provides tool schemas (all tools shown)
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {"name": "workflow_list", ...},
      {"name": "workflow_get", ...},
      {"name": "workflow_next", ...},
      {"name": "workflow_validate", ...}
    ]
  }
}

// 5. Client can now call tools
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "workflow_list",
  "params": {}
}

// 6. Server responds with tool result
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "workflows": [
      {"id": "ai-task-implementation", "name": "AI Task Prompt Workflow", "description": "Guides through task understanding → planning → implementation → verification", "category": "development", "version": "1.0.0"}
    ]
  }
}
```

## Implementation Requirements

### Server Implementation Checklist

- [ ] **Protocol Compliance**
  - Implement JSON-RPC 2.0 message handling
  - Support MCP protocol version `2024-11-05`
  - Handle stdio communication correctly

- [ ] **Initialization**
  - Respond to `initialize` requests
  - Provide server capabilities
  - Validate protocol version compatibility

- [ ] **Tool Discovery**
  - Implement `tools/list` method
  - Provide complete tool schemas (input/output)
  - Validate tool input parameters

- [ ] **Error Handling**
  - Use standard MCP error codes
  - Provide meaningful error messages
  - Include error context in data field

### Testing Requirements

- [ ] **Protocol Tests**
  - Test initialization handshake
  - Test tool discovery
  - Test error handling

- [ ] **Schema Tests**
  - Validate tool input/output schemas
  - Test parameter validation
  - Test error responses

## Versioning & Compatibility

- **Protocol Version**: `2024-11-05`
- **Specification Version**: 1.0.0
- The server MUST reject initialization requests with unsupported protocol versions.
- Backward-incompatible changes will increment the protocol version.
- Workflows and clients SHOULD specify the minimum compatible server version if applicable.

---

## Conformance

An implementation is conformant if it:
- Implements all required request/response structures as specified
- Handles all error cases as described
- Follows the communication, encoding, and framing requirements
- Passes all protocol and schema tests outlined in this document

Non-conformant implementations MUST NOT claim MCP compatibility.

---

## Glossary

- **MCP**: Model Context Protocol
- **Stdio**: Standard input/output (process communication channel)
- **Tool**: An API method exposed by the MCP server
- **Handshake**: The initialization exchange between client and server
- **Capabilities**: Features supported by the client or server, exchanged during initialization

---

## Changelog

- **2024-11-05**: Initial version, complete handshake, tool discovery, error handling, and lifecycle specification.

---

## References

- [Model Context Protocol](https://modelcontextprotocol.org)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [MCP Server Implementation Guide](https://modelcontextprotocol.io/docs/server-implementation)
- [Workflow API Specification](mcp-api-v1.0.md)
- [Workflow Schema](workflow.schema.json)

---

**Last Updated**: 2024-01-15  
**Specification Version**: 1.0.0  
**MCP Protocol Version**: 2024-11-05 