import { WorkflowNotFoundError } from '../../core/error-handler';

/**
 * Enforces context size limits and provides warnings for bloated requests
 */
export class ContextSizeEnforcer {
  private static readonly WARN_THRESHOLD = 10 * 1024;  // 10KB warning
  private static readonly ERROR_THRESHOLD = 50 * 1024; // 50KB hard limit
  private static readonly OPTIMAL_SIZE = 5 * 1024;     // 5KB optimal
  
  /**
   * Validate context size and provide feedback
   */
  static validateContext(
    context: any,
    stepId: string
  ): {
    isValid: boolean;
    sizeBytes: number;
    warnings: string[];
    suggestions: string[];
  } {
    const contextStr = JSON.stringify(context);
    const sizeBytes = contextStr.length;
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Hard limit
    if (sizeBytes > this.ERROR_THRESHOLD) {
      warnings.push(`Context size (${Math.round(sizeBytes/1024)}KB) exceeds maximum allowed (50KB)`);
      return { isValid: false, sizeBytes, warnings, suggestions };
    }
    
    // Warning threshold
    if (sizeBytes > this.WARN_THRESHOLD) {
      warnings.push(`Context size (${Math.round(sizeBytes/1024)}KB) is larger than recommended (10KB)`);
    }
    
    // Analyze for common issues
    this.analyzeContext(context, warnings, suggestions);
    
    return {
      isValid: true,
      sizeBytes,
      warnings,
      suggestions
    };
  }
  
  private static analyzeContext(
    context: any,
    warnings: string[],
    suggestions: string[]
  ): void {
    // Check for internal fields
    const internalFields = Object.keys(context).filter(k => k.startsWith('_'));
    if (internalFields.length > 0) {
      warnings.push(`Found internal fields that should not be sent: ${internalFields.join(', ')}`);
      suggestions.push('Remove all fields starting with underscore (_)');
    }
    
    // Check for large arrays
    Object.entries(context).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 10) {
          warnings.push(`Large array '${key}' with ${value.length} items`);
          suggestions.push(`Consider if you really need to send the entire '${key}' array`);
        }
        
        // Special check for common bloat
        if (key === 'implementationSteps') {
          warnings.push("Found 'implementationSteps' array - use 'currentStep' instead");
          suggestions.push("Replace 'implementationSteps' with just 'currentStep'");
        }
      }
    });
    
    // Check for unchanged data patterns
    if (context.userRules && context.userRules.length > 200) {
      suggestions.push("'userRules' appears unchanged - don't send it back");
    }
    
    if (context.clarifiedRequirements && !context.clarificationUpdated) {
      suggestions.push("'clarifiedRequirements' may be unchanged - only send if modified");
    }
    
    // Positive feedback
    if (warnings.length === 0 && context.sizeBytes < this.OPTIMAL_SIZE) {
      suggestions.push('✅ Excellent! Context is optimally sized');
    }
  }
  
  /**
   * Generate a report for the agent
   */
  static generateReport(validation: ReturnType<typeof this.validateContext>): string {
    const lines: string[] = [];
    
    lines.push(`Context Size: ${Math.round(validation.sizeBytes/1024)}KB`);
    
    if (validation.warnings.length > 0) {
      lines.push('\n⚠️  Warnings:');
      validation.warnings.forEach(w => lines.push(`- ${w}`));
    }
    
    if (validation.suggestions.length > 0) {
      lines.push('\n💡 Suggestions:');
      validation.suggestions.forEach(s => lines.push(`- ${s}`));
    }
    
    if (!validation.isValid) {
      lines.push('\n❌ Request rejected: Context too large');
      lines.push('Please reduce context size and try again');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Middleware for workflow service
   */
  static createMiddleware() {
    return (context: any, stepId: string) => {
      const validation = this.validateContext(context, stepId);
      
      if (!validation.isValid) {
        throw new Error(this.generateReport(validation));
      }
      
      // Log warnings but don't block
      if (validation.warnings.length > 0) {
        console.warn('Context optimization opportunity:', validation);
      }
      
      return context;
    };
  }
}