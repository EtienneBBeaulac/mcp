/**
 * Proof of concept for input context optimization
 */

export interface ContextRequirements {
  required?: string[];
  optional?: string[];
  preserve?: string[];
  exclude?: string[];
  maxSize?: number;
}

export class ContextStripper {
  /**
   * Strip context to only required fields
   */
  static stripContext(
    fullContext: any,
    requirements?: ContextRequirements
  ): { context: any; stats: { before: number; after: number; reduction: number } } {
    const before = JSON.stringify(fullContext).length;
    
    if (!requirements) {
      // Default stripping - remove common bloat
      const stripped = this.defaultStrip(fullContext);
      const after = JSON.stringify(stripped).length;
      return {
        context: stripped,
        stats: {
          before,
          after,
          reduction: Math.round((1 - after / before) * 100)
        }
      };
    }
    
    // Apply requirements
    const stripped = this.applyRequirements(fullContext, requirements);
    const after = JSON.stringify(stripped).length;
    
    return {
      context: stripped,
      stats: {
        before,
        after,
        reduction: Math.round((1 - after / before) * 100)
      }
    };
  }
  
  private static defaultStrip(context: any): any {
    const stripped = { ...context };
    
    // Always remove internal fields
    delete stripped._loopState;
    delete stripped._currentLoop;
    delete stripped._contextSize;
    delete stripped._warnings;
    
    // Remove large arrays unless they're the current iteration item
    Object.keys(stripped).forEach(key => {
      const value = stripped[key];
      if (Array.isArray(value) && value.length > 5) {
        // Keep only if it's referenced as current
        if (key !== stripped.currentItem && key !== stripped.itemVar) {
          delete stripped[key];
        }
      }
    });
    
    return stripped;
  }
  
  private static applyRequirements(
    context: any,
    requirements: ContextRequirements
  ): any {
    const { required = [], optional = [], preserve = [], exclude = [] } = requirements;
    const allowedFields = new Set([...required, ...optional, ...preserve]);
    const stripped: any = {};
    
    // Only copy allowed fields
    allowedFields.forEach(field => {
      if (field in context && !exclude.includes(field)) {
        stripped[field] = context[field];
      }
    });
    
    // Always preserve critical fields
    ['workflowId', 'stepId'].forEach(field => {
      if (field in context) {
        stripped[field] = context[field];
      }
    });
    
    return stripped;
  }
  
  /**
   * Estimate savings for a workflow
   */
  static estimateSavings(workflow: any): {
    currentAvgSize: number;
    optimizedAvgSize: number;
    savingsPercent: number;
  } {
    let currentTotal = 0;
    let optimizedTotal = 0;
    let stepCount = 0;
    
    // Simulate context growth through workflow
    const simulatedContext: any = {};
    
    workflow.steps.forEach((step: any) => {
      // Simulate context accumulation
      simulatedContext[`step${stepCount}Result`] = { data: 'x'.repeat(100) };
      simulatedContext.completedSteps = Array(stepCount).fill('step');
      
      const currentSize = JSON.stringify(simulatedContext).length;
      currentTotal += currentSize;
      
      // Apply optimization
      const requirements = step.contextRequirements || {};
      const { context } = this.stripContext(simulatedContext, requirements);
      const optimizedSize = JSON.stringify(context).length;
      optimizedTotal += optimizedSize;
      
      stepCount++;
    });
    
    const avgCurrent = Math.round(currentTotal / stepCount);
    const avgOptimized = Math.round(optimizedTotal / stepCount);
    
    return {
      currentAvgSize: avgCurrent,
      optimizedAvgSize: avgOptimized,
      savingsPercent: Math.round((1 - avgOptimized / avgCurrent) * 100)
    };
  }
}