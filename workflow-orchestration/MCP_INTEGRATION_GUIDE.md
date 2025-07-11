# 🚀 **Workflow Orchestration MCP Integration Guide**

## **Overview**

This guide shows how to integrate the Workflow Orchestration System with AI agents like **Cursor**, **Claude Desktop**, and **VS Code** using the **Model Context Protocol (MCP)**.

## **🔧 Quick Setup**

### **1. Install Dependencies**

```bash
npm install
```

### **2. Build the MCP Server**

```bash
npm run build:mcp
```

### **3. Test the Server**

```bash
node dist/mcp-server-simple.js
```

## **📋 Integration Options**

### **🎯 Cursor Integration**

Add this to your Cursor configuration:

#### **Using NPM Package** (Once Published)
```json
{
  "mcp": {
    "servers": {
      "workflow-orchestration": {
        "command": "npx",
        "args": [
          "-y",
          "@modelcontextprotocol/server-workflow-orchestration"
        ]
      }
    }
  }
}
```

#### **Using Local Development Build**
```json
{
  "mcp": {
    "servers": {
      "workflow-orchestration": {
        "command": "node",
        "args": [
          "/Users/etienneb/git/mcp/workflow-orchestration/dist/mcp-server-simple.js"
        ]
      }
    }
  }
}
```

### **🖥️ Claude Desktop Integration**

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "workflow-orchestration": {
      "command": "node",
      "args": [
        "/path/to/your/workflow-orchestration/dist/mcp-server-simple.js"
      ]
    }
  }
}
```

### **📝 VS Code Integration**

Add to your VS Code settings (JSON):

```json
{
  "mcp": {
    "servers": {
      "workflow-orchestration": {
        "command": "node",
        "args": [
          "/path/to/your/workflow-orchestration/dist/mcp-server-simple.js"
        ]
      }
    }
  }
}
```

## **✅ Verification**

Test that the server is working:

```bash
# Test tool list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/mcp-server-simple.js

# Test workflow list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"workflow_list","arguments":{}}}' | node dist/mcp-server-simple.js
```

You should see:
- ✅ Two workflows loaded: `ai-task-prompt-workflow` and `simple-auth-implementation`
- ✅ Four tools available: `workflow_list`, `workflow_get`, `workflow_next`, `workflow_validate`
- ✅ JSON-RPC responses with proper structure

## **🛠️ Available Tools**

### **1. `workflow_list`**
- **Description**: List all available workflows
- **Parameters**: None
- **Returns**: Array of workflow definitions with metadata

### **2. `workflow_get`**
- **Description**: Get detailed workflow information
- **Parameters**: 
  - `workflowId` (string): Workflow identifier
- **Returns**: Complete workflow definition with steps and guidance

### **3. `workflow_next`**
- **Description**: Get the next step in a workflow
- **Parameters**:
  - `workflowId` (string): Workflow identifier
  - `completedSteps` (array): Array of completed step IDs
  - `context` (object, optional): Execution context for conditional steps
- **Returns**: Next step details or completion status

### **4. `workflow_validate`**
- **Description**: Validate step completion
- **Parameters**:
  - `workflowId` (string): Workflow identifier
  - `stepId` (string): Step identifier
  - `output` (string): Step output to validate
- **Returns**: Validation result and feedback

## **💡 Usage Examples**

### **1. Discover Available Workflows**
```bash
# Agent uses workflow_list tool
{
  "name": "workflow_list",
  "arguments": {}
}
```

### **2. Get Workflow Details**
```bash
# Agent uses workflow_get tool
{
  "name": "workflow_get", 
  "arguments": {
    "workflowId": "ai-task-prompt-workflow"
  }
}
```

### **3. Start Workflow Execution**
```bash
# Agent uses workflow_next tool
{
  "name": "workflow_next",
  "arguments": {
    "workflowId": "ai-task-prompt-workflow",
    "completedSteps": []
  }
}
```

### **3a. Start Workflow with Context**
```bash
# Agent uses workflow_next tool with context for conditional steps
{
  "name": "workflow_next",
  "arguments": {
    "workflowId": "adaptive-development-workflow",
    "completedSteps": [],
    "context": {
      "taskScope": "large",
      "userExpertise": "expert",
      "complexity": 0.8
    }
  }
}
```

### **4. Validate Step Completion**
```bash
# Agent uses workflow_validate tool
{
  "name": "workflow_validate",
  "arguments": {
    "workflowId": "ai-task-prompt-workflow", 
    "stepId": "analyze-current-auth",
    "output": "Current authentication uses basic session cookies..."
  }
}
```

## **🔄 Typical Workflow**

1. **Discovery**: Agent calls `workflow_list` to see available workflows
2. **Selection**: Agent calls `workflow_get` to understand a specific workflow
3. **Context Setup**: Agent determines context variables (taskScope, userExpertise, etc.)
4. **Execution**: Agent calls `workflow_next` repeatedly to get steps (with context for conditional workflows)
5. **Validation**: Agent calls `workflow_validate` after completing each step
6. **Completion**: Agent continues until workflow is complete

## **🔄 Conditional Workflows**

### **Context-Aware Step Execution**
Workflows can now include conditional steps that execute based on context variables:

- **`taskScope`**: "small", "medium", "large"
- **`userExpertise`**: "novice", "intermediate", "expert"  
- **`complexity`**: Numeric value 0.1 to 1.0
- **Custom variables**: Any key-value pairs relevant to your workflow

### **Example Conditional Step**
```json
{
  "id": "advanced-optimization",
  "title": "Advanced Performance Optimization",
  "prompt": "Implement advanced caching and optimization strategies.",
  "runCondition": {
    "and": [
      {"var": "taskScope", "equals": "large"},
      {"var": "userExpertise", "equals": "expert"}
    ]
  }
}
```

### **Supported Condition Operators**
- `equals`, `not_equals`: Value comparison
- `gt`, `gte`, `lt`, `lte`: Numeric comparison  
- `and`, `or`, `not`: Logical operations

This enables "choose your own adventure" workflows that adapt to different scenarios and user preferences.

## **📊 Benefits for AI Agents**

### **🎯 Structured Guidance**
- **Step-by-step instructions** for complex tasks
- **Dependency management** between steps
- **Quality validation** for each step

### **🧠 Context Awareness**
- **Pre-conditions** and requirements
- **Clarification prompts** for ambiguous situations
- **Meta-guidance** for decision-making

### **🔄 Iterative Improvement**
- **Validation feedback** for continuous improvement
- **Adaptive workflows** based on project context
- **Reusable patterns** across similar tasks

## **🚀 Advanced Features**

### **🎨 Custom Workflows**
Add your own workflow definitions in `spec/examples/` directory:

```json
{
  "id": "my-custom-workflow",
  "name": "My Custom Workflow",
  "description": "Custom workflow for specific tasks",
  "steps": [
    {
      "id": "step-1",
      "name": "First Step",
      "description": "Description of what to do",
      "requirements": ["requirement1", "requirement2"]
    }
  ]
}
```

### **🔧 Environment Configuration**
Set environment variables for customization:

```bash
# Enable debug logging
export MCP_DEBUG=true

# Custom workflow directory
export WORKFLOW_DIR=/path/to/custom/workflows
```

## **🛡️ Security Considerations**

- **Input Validation**: All parameters are validated against JSON schemas
- **Output Sanitization**: All outputs are sanitized for safe transmission
- **Resource Limits**: Step outputs are limited to 10,000 characters
- **Access Control**: Read-only access to workflow definitions

## **📈 Performance**

- **Response Times**: Sub-millisecond to low-millisecond response times
- **Concurrent Requests**: Supports multiple concurrent workflow executions
- **Memory Usage**: Efficient in-memory caching of workflow definitions
- **Error Handling**: Robust error handling with detailed error messages

## **🔍 Troubleshooting**

### **Common Issues**

1. **"Cannot find module" errors**
   - Solution: Run `npm install` and `npm run build:mcp`

2. **"Unknown tool" errors**
   - Solution: Check tool names match exactly: `workflow_list`, `workflow_get`, `workflow_next`, `workflow_validate`

3. **"Parameter required" errors**
   - Solution: Ensure all required parameters are provided and properly typed

### **Debug Mode**
Enable debug logging:
```bash
export MCP_DEBUG=true
node dist/mcp-server-simple.js
```

## **📞 Support**

For issues or questions:
1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Examine the existing workflow definitions in `spec/examples/`
4. Run the test suite: `npm test`

## **🎯 Next Steps**

1. **Test Integration**: Verify the MCP server works with your agent
2. **Explore Workflows**: Try the existing workflow examples
3. **Create Custom Workflows**: Add your own workflow definitions
4. **Monitor Performance**: Use debug mode to optimize performance
5. **Provide Feedback**: Share your experience and improvement suggestions

---

**🎉 You're ready to use structured workflow orchestration with your AI agent!** 