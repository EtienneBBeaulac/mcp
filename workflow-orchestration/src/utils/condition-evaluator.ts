/**
 * Safe condition evaluator for workflow step runCondition expressions.
 * Supports a limited set of operators to prevent code injection.
 */

export interface ConditionContext {
  [key: string]: any;
}

export interface Condition {
  var?: string;
  equals?: any;
  not_equals?: any;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  and?: Condition[];
  or?: Condition[];
  not?: Condition;
}

/**
 * Evaluates a condition expression against a context.
 * Returns true if the condition passes, false otherwise.
 * If condition is null/undefined, returns true (step is eligible).
 * If evaluation fails, returns false (step is skipped for safety).
 */
export function evaluateCondition(
  condition: Condition | null | undefined,
  context: ConditionContext = {}
): boolean {
  // No condition means step is always eligible
  if (!condition || typeof condition !== 'object') {
    return true;
  }

  // Empty object means no condition, so step is eligible
  if (Object.keys(condition).length === 0) {
    return true;
  }

  try {
    return evaluateConditionUnsafe(condition, context);
  } catch (error) {
    // Log error in production, but return false for safety
    console.warn('Condition evaluation failed:', error);
    return false;
  }
}

function evaluateConditionUnsafe(condition: Condition, context: ConditionContext): boolean {
  // Variable reference
  if (condition.var !== undefined) {
    const value = context[condition.var];
    
    // Comparison operators
    if (condition.equals !== undefined) {
      return value === condition.equals;
    }
    if (condition.not_equals !== undefined) {
      return value !== condition.not_equals;
    }
    if (condition.gt !== undefined) {
      return typeof value === 'number' && value > condition.gt;
    }
    if (condition.gte !== undefined) {
      return typeof value === 'number' && value >= condition.gte;
    }
    if (condition.lt !== undefined) {
      return typeof value === 'number' && value < condition.lt;
    }
    if (condition.lte !== undefined) {
      return typeof value === 'number' && value <= condition.lte;
    }
    
    // If only var is specified, check for truthiness
    return !!value;
  }

  // Logical operators
  if (condition.and !== undefined) {
    if (!Array.isArray(condition.and)) {
      throw new Error('and operator requires an array');
    }
    return condition.and.every(subCondition => evaluateConditionUnsafe(subCondition, context));
  }

  if (condition.or !== undefined) {
    if (!Array.isArray(condition.or)) {
      throw new Error('or operator requires an array');
    }
    return condition.or.some(subCondition => evaluateConditionUnsafe(subCondition, context));
  }

  if (condition.not !== undefined) {
    return !evaluateConditionUnsafe(condition.not, context);
  }

  // Unknown condition format
  throw new Error('Invalid condition format');
}

/**
 * Validates that a condition uses only supported operators.
 * Throws an error if unsupported operators are found.
 */
export function validateCondition(condition: any): void {
  if (!condition || typeof condition !== 'object') {
    return;
  }

  const supportedKeys = [
    'var', 'equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'and', 'or', 'not'
  ];

  const conditionKeys = Object.keys(condition);
  const unsupportedKeys = conditionKeys.filter(key => !supportedKeys.includes(key));

  if (unsupportedKeys.length > 0) {
    throw new Error(`Unsupported condition operators: ${unsupportedKeys.join(', ')}`);
  }

  // Recursively validate nested conditions
  if (condition.and && Array.isArray(condition.and)) {
    condition.and.forEach(validateCondition);
  }
  if (condition.or && Array.isArray(condition.or)) {
    condition.or.forEach(validateCondition);
  }
  if (condition.not) {
    validateCondition(condition.not);
  }
} 