# Contributing Guide

> 📝 **How to contribute to the WorkRail System**

[![Status](https://img.shields.io/badge/status-specification-orange.svg)](https://github.com/EtienneBBeaulac/mcp)
[![Spec Version](https://img.shields.io/badge/spec-1.0.0-blue.svg)](specs/)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [Contributing Overview](#contributing-overview)
2. [Development Setup](#development-setup)
3. [Code Standards](#code-standards)
4. [Git Workflow](#git-workflow)
5. [Testing Requirements](#testing-requirements)
6. [Documentation Standards](#documentation-standards)
7. [Review Process](#review-process)
8. [Release Process](#release-process)

---

## ⚠️ Important Note

**This is a specification project.** The contributing guidelines described below are the planned approach for when implementation begins. Currently, the project is in the specification phase, so contributions focus on improving the design and documentation.

For now, you can contribute by:
- Reviewing and improving specifications
- Designing new workflows
- Enhancing documentation
- Planning implementation approaches
- Providing feedback on the design

---

## Contributing Overview

### How to Contribute

1. **Review Specifications**: Provide feedback on current specs
2. **Design Workflows**: Create new workflow definitions
3. **Improve Documentation**: Enhance clarity and completeness
4. **Plan Implementation**: Discuss technical approaches
5. **Report Issues**: Identify problems or gaps

### Contribution Areas

- **Specifications**: API design, workflow schema, protocols
- **Documentation**: Guides, examples, reference materials
- **Workflows**: New workflow definitions and examples
- **Architecture**: System design and technical decisions
- **Testing**: Test strategies and quality assurance

---

## Development Setup

### Prerequisites

```bash
# Required tools
Node.js 18+
Git 2.30+
VS Code (recommended)

# Optional tools
Docker (for testing)
Postman (for API testing)
```

### Local Setup

```bash
# Clone the repository
git clone https://github.com/EtienneBBeaulac/mcp.git
cd mcp/packages/workrail

# Install dependencies (when implementation begins)
npm install

# Setup pre-commit hooks
npm run setup-hooks

# Verify setup
npm run verify-setup
```

### Development Environment

```bash
# Start development server (when implemented)
npm run dev

# Run tests (when implemented)
npm test

# Lint code (when implemented)
npm run lint

# Format code (when implemented)
npm run format
```

---

## Code Standards

### TypeScript Standards

```typescript
// Use strict TypeScript configuration
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}

// Example: Proper type definitions
export interface WorkflowStep {
  id: string;
  title: string;
  prompt: string;
  requireConfirmation?: boolean;
  validationRules?: ValidationRule[];
}

export class WorkflowOrchestrator {
  constructor(
    private storage: WorkflowStorage,
    private validator: WorkflowValidator
  ) {}
  
  async getNextStep(
    workflowId: string,
    completedSteps: string[]
  ): Promise<NextStepResult> {
    // Implementation
  }
}
```

### Naming Conventions

```typescript
// Files: kebab-case
workflow-orchestrator.ts
mcp-server.ts
validation-engine.ts

// Classes: PascalCase
export class WorkflowOrchestrator {}
export class MCPServer {}
export class ValidationEngine {}

// Functions: camelCase
export async function getNextStep() {}
export function validateWorkflow() {}

// Constants: UPPER_SNAKE_CASE
export const MAX_WORKFLOW_SIZE = 1024 * 1024;
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

// Interfaces: PascalCase with 'I' prefix for complex interfaces
export interface IWorkflowStorage {}
export interface WorkflowStep {}
```

### Error Handling

```typescript
// Custom error classes
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: number,
    public data?: any
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class WorkflowNotFoundError extends WorkflowError {
  constructor(workflowId: string) {
    super(`Workflow not found: ${workflowId}`, -32001);
  }
}

// Proper error handling
export async function getWorkflow(id: string): Promise<Workflow> {
  try {
    const workflow = await storage.getWorkflow(id);
    if (!workflow) {
      throw new WorkflowNotFoundError(id);
    }
    return workflow;
  } catch (error) {
    if (error instanceof WorkflowError) {
      throw error;
    }
    throw new WorkflowError('Failed to retrieve workflow', -32603, error);
  }
}
```

### Documentation Standards

```typescript
/**
 * Orchestrates workflow execution and state management.
 * 
 * The WorkflowOrchestrator is responsible for:
 * - Managing workflow state across requests
 * - Providing step-by-step guidance
 * - Validating workflow outputs
 * - Handling workflow lifecycle events
 * 
 * @example
 * ```typescript
 * const orchestrator = new WorkflowOrchestrator(storage, validator);
 * const nextStep = await orchestrator.getNextStep('workflow-id', ['step-1']);
 * ```
 */
export class WorkflowOrchestrator {
  /**
   * Gets the next step in a workflow execution.
   * 
   * @param workflowId - The unique identifier of the workflow
   * @param completedSteps - Array of completed step IDs
   * @returns Promise resolving to the next step information
   * 
   * @throws {WorkflowNotFoundError} When workflow doesn't exist
   * @throws {WorkflowError} When workflow execution fails
   */
  async getNextStep(
    workflowId: string,
    completedSteps: string[]
  ): Promise<NextStepResult> {
    // Implementation
  }
}
```

---

## Git Workflow

### Branch Strategy

```bash
# Main branches
main          # Production-ready code
develop       # Integration branch
feature/*     # Feature development
bugfix/*      # Bug fixes
hotfix/*      # Critical fixes
release/*     # Release preparation
```

### Commit Standards

```bash
# Commit message format
<type>(<scope>): <description>

[optional body]

[optional footer]

# Examples
feat(workflow): add support for conditional steps
fix(api): resolve workflow validation error
docs(readme): update installation instructions
test(orchestrator): add unit tests for state management
refactor(storage): simplify file system storage interface
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-workflow-type
   ```

2. **Make Changes**
   ```bash
   # Make your changes
   git add .
   git commit -m "feat(workflow): add conditional step support"
   ```

3. **Push and Create PR**
   ```bash
   git push origin feature/new-workflow-type
   # Create PR on GitHub
   ```

4. **Review Process**
   - Automated checks must pass
   - Code review required
   - Documentation updated
   - Tests added/updated

### Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

---

## Testing Requirements

### Test Coverage Requirements

```typescript
// Minimum coverage targets
const coverageTargets = {
  statements: 90,
  branches: 85,
  functions: 90,
  lines: 90
};

// Test file structure
describe('WorkflowOrchestrator', () => {
  describe('getNextStep', () => {
    it('should return next step when workflow exists', async () => {
      // Arrange
      const workflow = createMockWorkflow();
      const orchestrator = new WorkflowOrchestrator(mockStorage, mockValidator);
      
      // Act
      const result = await orchestrator.getNextStep('test-workflow', []);
      
      // Assert
      expect(result.step).toBeDefined();
      expect(result.isComplete).toBe(false);
    });
    
    it('should throw error when workflow not found', async () => {
      // Arrange
      const orchestrator = new WorkflowOrchestrator(mockStorage, mockValidator);
      
      // Act & Assert
      await expect(
        orchestrator.getNextStep('non-existent', [])
      ).rejects.toThrow(WorkflowNotFoundError);
    });
  });
});
```

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete workflows
4. **Performance Tests**: Test performance requirements
5. **Security Tests**: Test security measures

### Test Naming

```typescript
// Good test names
describe('WorkflowOrchestrator', () => {
  describe('getNextStep', () => {
    it('should return next step when workflow exists and steps remain', () => {});
    it('should return completion status when all steps are done', () => {});
    it('should throw WorkflowNotFoundError for non-existent workflow', () => {});
    it('should maintain state across multiple step requests', () => {});
  });
});

// Bad test names
describe('WorkflowOrchestrator', () => {
  describe('getNextStep', () => {
    it('should work', () => {});
    it('test 1', () => {});
    it('does stuff', () => {});
  });
});
```

---

## Documentation Standards

### Code Documentation

```typescript
/**
 * Validates workflow structure and content.
 * 
 * This validator ensures that workflows conform to the schema
 * and contain valid step definitions. It performs both structural
 * validation (schema compliance) and semantic validation (business rules).
 * 
 * @example
 * ```typescript
 * const validator = new WorkflowValidator();
 * const result = await validator.validate(workflow);
 * if (!result.valid) {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export class WorkflowValidator {
  /**
   * Validates a workflow against the schema and business rules.
   * 
   * @param workflow - The workflow object to validate
   * @returns Promise resolving to validation result
   * 
   * @throws {ValidationError} When validation process fails
   */
  async validate(workflow: Workflow): Promise<ValidationResult> {
    // Implementation
  }
}
```

### README Standards

```markdown
# Component Name

Brief description of what this component does.

## Features

- Key feature 1
- Key feature 2
- Key feature 3

## Usage

```typescript
import { ComponentName } from './component-name';

const component = new ComponentName();
const result = await component.doSomething();
```

## API Reference

### `ComponentName`

Main class for this component.

#### Methods

##### `doSomething(input: string): Promise<Result>`

Performs the main operation.

**Parameters:**
- `input` (string): The input to process

**Returns:**
- Promise<Result>: The processed result

**Throws:**
- Error: When processing fails

## Examples

### Basic Usage

```typescript
// Example code here
```

### Advanced Usage

```typescript
// More complex example
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.
```

---

## Review Process

### Code Review Checklist

- [ ] **Functionality**: Does the code work as intended?
- [ ] **Testing**: Are there adequate tests?
- [ ] **Documentation**: Is the code well-documented?
- [ ] **Performance**: Are there performance implications?
- [ ] **Security**: Are there security concerns?
- [ ] **Standards**: Does the code follow project standards?
- [ ] **Maintainability**: Is the code maintainable?

### Review Guidelines

```markdown
# Code Review Template

## Summary
Brief description of the changes.

## Changes Made
- [ ] Feature A
- [ ] Bug fix B
- [ ] Documentation update C

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Documentation
- [ ] Code comments added
- [ ] README updated
- [ ] API documentation updated

## Security
- [ ] No security vulnerabilities introduced
- [ ] Input validation implemented
- [ ] Error handling secure

## Performance
- [ ] No performance regressions
- [ ] Efficient algorithms used
- [ ] Memory usage optimized

## Questions/Concerns
- Any questions for the reviewer
- Areas of concern
- Alternative approaches considered
```

### Review Response

```markdown
# Review Response

## Overall Assessment
[Approve/Request Changes/Comment]

## Positive Feedback
- What was done well
- Good practices followed

## Areas for Improvement
- Specific suggestions
- Code examples if needed

## Questions
- Clarification needed
- Design decisions to discuss

## Next Steps
- What needs to be done before approval
- Follow-up actions
```

---

## Release Process

### Release Preparation

1. **Feature Freeze**
   ```bash
   # Create release branch
   git checkout -b release/v0.1.0
   ```

2. **Update Version**
   ```bash
   # Update version in package.json
   npm version patch  # or minor/major
   ```

3. **Update Documentation**
   ```bash
   # Update CHANGELOG.md
   # Update version badges
   # Update release notes
   ```

4. **Final Testing**
   ```bash
   # Run full test suite
   npm test
   npm run test:integration
   npm run test:e2e
   ```

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version numbers updated
- [ ] Release notes prepared
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Deployment tested

### Release Process

```bash
# 1. Merge to main
git checkout main
   git merge release/v0.1.0

# 2. Create tag
   git tag -a v0.1.0 -m "Release v0.1.0"

# 3. Push changes
git push origin main
   git push origin v0.1.0

# 4. Create GitHub release
# Use GitHub web interface to create release from tag
```

---

## Communication

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Pull Requests**: Code reviews and collaboration
- **Documentation**: Inline comments and README updates

### Issue Templates

```markdown
# Bug Report

## Description
Clear description of the bug.

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.0.0]
- Version: [e.g., 1.0.0]

## Additional Context
Any other context about the problem.
```

---

**Note**: This contributing guide describes the planned development workflow for when implementation begins. The actual development process will follow these guidelines during the implementation phase. 