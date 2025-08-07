/**
 * Workflow optimizer that adds context guidance to steps
 */

export class WorkflowOptimizer {
  /**
   * Enhance a workflow with context optimization hints
   */
  static optimizeWorkflow(workflow: any): any {
    const optimized = { ...workflow };
    
    // Add global context guidance
    if (!optimized.metaGuidance) {
      optimized.metaGuidance = [];
    }
    
    optimized.metaGuidance.push(
      "CONTEXT OPTIMIZATION: Only send required context fields to workflow_next",
      "Remove _loopState and _currentLoop from your requests",
      "For loops, only send currentStep, stepIndex, and stepIteration"
    );
    
    // Add context requirements to each step
    optimized.steps = optimized.steps.map((step: any) => {
      if (step.type === 'loop') {
        return this.optimizeLoopStep(step);
      }
      return this.optimizeRegularStep(step);
    });
    
    return optimized;
  }
  
  private static optimizeRegularStep(step: any): any {
    const optimized = { ...step };
    
    // Add context hint to prompt
    if (!optimized.prompt.includes('CONTEXT:')) {
      optimized.prompt = `${optimized.prompt}

**CONTEXT:** Only preserve fields you explicitly use in this step. Remove accumulated data from previous steps unless needed.`;
    }
    
    // Add explicit context requirements (future schema enhancement)
    optimized.contextRequirements = this.inferRequirements(step);
    
    return optimized;
  }
  
  private static optimizeLoopStep(loopStep: any): any {
    const optimized = { ...loopStep };
    
    // Add loop-specific guidance
    if (!optimized.loopGuidance) {
      optimized.loopGuidance = [];
    }
    
    optimized.loopGuidance.push(
      "Send only currentStep, stepIndex, and loop control variables",
      "Do NOT send the full implementationSteps array back",
      "Remove _loopState and _currentLoop from requests"
    );
    
    // Optimize body steps
    if (Array.isArray(optimized.body)) {
      optimized.body = optimized.body.map((bodyStep: any) => ({
        ...bodyStep,
        contextRequirements: {
          required: ["currentStep", "stepIndex", "stepIteration"],
          exclude: ["implementationSteps", "_loopState", "_currentLoop"]
        }
      }));
    }
    
    return optimized;
  }
  
  private static inferRequirements(step: any): any {
    const requirements: any = {
      required: [],
      optional: [],
      exclude: ["_loopState", "_currentLoop", "_contextSize", "_warnings"]
    };
    
    // Analyze prompt for variable references
    const variablePattern = /\{\{(\w+)(?:\.\w+)*\}\}/g;
    const matches = step.prompt.matchAll(variablePattern);
    
    for (const match of matches) {
      const variable = match[1];
      if (!requirements.required.includes(variable)) {
        requirements.required.push(variable);
      }
    }
    
    // Common patterns
    if (step.id.includes('prep')) {
      requirements.optional.push('previousStepOutput');
    }
    
    if (step.id.includes('verify')) {
      requirements.required.push('verificationTarget');
    }
    
    return requirements;
  }
  
  /**
   * Generate agent instructions for context management
   */
  static generateContextGuide(): string {
    return `
# Context Management Guide for Agents

## General Rules

1. **Never echo back unchanged data** - Only send what you've modified
2. **Strip internal fields** - Remove _loopState, _currentLoop, _contextSize
3. **Minimize arrays** - Don't send full arrays unless you're modifying them

## For Loops

When calling workflow_next inside a loop:
- ✅ Send: currentStep, stepIndex, stepIteration, your changes
- ❌ Don't send: implementationSteps array, _loopState, previous iterations

## Example

Instead of:
\`\`\`json
{
  "workflowId": "...",
  "completedSteps": [...],
  "context": { /* entire 17KB context */ }
}
\`\`\`

Send:
\`\`\`json
{
  "workflowId": "...",
  "completedSteps": [...],
  "context": {
    "currentStep": { /* just current */ },
    "stepIndex": 1,
    "stepIteration": 2,
    "featureBranch": "...",
    "newDataFromThisStep": "..."
  }
}
\`\`\`

This reduces request size by 80-90%!
`;
  }
}