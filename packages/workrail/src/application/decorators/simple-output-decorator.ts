import { IApplicationMediator } from '../app';

// Context optimization instructions to inject
const CONTEXT_OPTIMIZATION_TEXT = `

**CONTEXT OPTIMIZATION**:
When calling workflow_next, send ONLY the fields you've modified or created:
- DO NOT echo back unchanged arrays (implementationSteps, _loopState, etc.)
- Remove internal fields starting with underscore (_)
- Send only what changed from the previous context
- Expected context size: < 5KB

Example of optimized context:
\`\`\`json
{
  "workflowId": "...",
  "completedSteps": [...],
  "context": {
    // Only include fields you created or modified:
    "newVariable": "value",
    "modifiedField": "updated value"
    // DO NOT include: arrays, _fields, unchanged data
  }
}
\`\`\``;

/**
 * Decorator that adds context optimization instructions to workflow_next responses.
 * This helps agents understand they should send minimal context back to reduce token usage.
 * 
 * Follows the decorator pattern established by CachingWorkflowStorage.
 * User Rules Applied:
 * - Uses dependency injection pattern
 * - Maintains immutability (doesn't modify original response)
 * - Follows Clean Architecture (single responsibility)
 * - Stateless implementation
 */
export class SimpleOutputDecorator implements IApplicationMediator {
  constructor(private readonly wrapped: IApplicationMediator) {}

  /**
   * Intercepts execute calls and adds optimization text to workflow_next responses
   */
  async execute(method: string, params: any): Promise<any> {
    // Get the original response
    const result = await this.wrapped.execute(method, params);
    
    // Only modify workflow_next responses that have guidance
    if (method === 'workflow_next' && result?.guidance?.prompt) {
      // Create a new response object to maintain immutability
      return {
        ...result,
        guidance: {
          ...result.guidance,
          prompt: result.guidance.prompt + CONTEXT_OPTIMIZATION_TEXT
        }
      };
    }
    
    // Pass through all other responses unchanged
    return result;
  }

  /**
   * Delegate all other methods to the wrapped mediator
   */
  register(method: string, handler: any): void {
    this.wrapped.register(method, handler);
  }

  setResponseValidator(fn: (method: string, result: any) => void): void {
    this.wrapped.setResponseValidator(fn);
  }
}