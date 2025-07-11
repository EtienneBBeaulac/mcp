import { ValidationError } from '../../core/error-handler';
import { evaluateCondition, Condition, ConditionContext } from '../../utils/condition-evaluator';
import Ajv from 'ajv';

export interface ValidationRule {
  type: 'contains' | 'regex' | 'length' | 'schema';
  message: string;
  value?: string;      // for 'contains' type
  pattern?: string;    // for 'regex' type
  flags?: string;      // for 'regex' type
  min?: number;        // for 'length' type
  max?: number;        // for 'length' type
  schema?: Record<string, any>; // for 'schema' type
  condition?: Condition; // for context-aware validation
}

export interface ValidationComposition {
  and?: ValidationCriteria[];
  or?: ValidationCriteria[];
  not?: ValidationCriteria;
}

export type ValidationCriteria = ValidationRule | ValidationComposition;

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * ValidationEngine handles step output validation with support for
 * multiple validation rule types. This engine is responsible for
 * evaluating validation criteria against step outputs.
 */
export class ValidationEngine {
  private ajv: Ajv;
  private schemaCache = new Map<string, any>();
  
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Compiles a JSON schema with caching for performance.
   * 
   * @param schema - The JSON schema to compile
   * @returns Compiled schema validator function
   */
  private compileSchema(schema: Record<string, any>): any {
    const schemaKey = JSON.stringify(schema);
    
    if (this.schemaCache.has(schemaKey)) {
      return this.schemaCache.get(schemaKey);
    }
    
    try {
      const compiledSchema = this.ajv.compile(schema);
      this.schemaCache.set(schemaKey, compiledSchema);
      return compiledSchema;
    } catch (error) {
      throw new ValidationError(`Invalid JSON schema: ${error}`);
    }
  }

  /**
   * Evaluates validation criteria (either array or composition format).
   * 
   * @param output - The step output to validate
   * @param criteria - Validation criteria to evaluate
   * @param context - Execution context for conditional validation
   * @returns ValidationResult with validation status and issues
   */
  private evaluateCriteria(
    output: string,
    criteria: ValidationRule[] | ValidationComposition,
    context: ConditionContext
  ): ValidationResult {
    try {
      // Handle array format (backward compatibility)
      if (Array.isArray(criteria)) {
        return this.evaluateRuleArray(output, criteria, context);
      }

      // Handle composition format
      if (this.isValidationComposition(criteria)) {
        const compositionResult = this.evaluateComposition(output, criteria, context);
        return {
          valid: compositionResult,
          issues: compositionResult ? [] : ['Validation composition failed'],
          suggestions: compositionResult ? [] : ['Review validation criteria and adjust output accordingly.']
        };
      }

      // Invalid criteria format
      throw new ValidationError('Invalid validation criteria format');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Error evaluating validation criteria: ${error}`);
    }
  }

  /**
   * Evaluates an array of validation rules (legacy format).
   * 
   * @param output - The step output to validate
   * @param rules - Array of validation rules to apply
   * @param context - Execution context for conditional validation
   * @returns ValidationResult with validation status and issues
   */
  private evaluateRuleArray(
    output: string,
    rules: ValidationRule[],
    context: ConditionContext
  ): ValidationResult {
    const issues: string[] = [];

    // Process each validation rule
    for (const rule of rules) {
      try {
        // Check if rule condition is met (if condition exists)
        if (rule.condition && !evaluateCondition(rule.condition, context)) {
          // Skip this rule if condition is not met
          continue;
        }
        
        this.evaluateRule(output, rule, issues);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new ValidationError(`Error evaluating validation rule: ${error}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions: issues.length > 0 ? ['Review validation criteria and adjust output accordingly.'] : []
    };
  }

  /**
   * Evaluates a validation composition with logical operators.
   * 
   * @param output - The step output to validate
   * @param composition - The validation composition to evaluate
   * @param context - Execution context for conditional validation
   * @returns Boolean indicating if the composition is valid
   */
  private evaluateComposition(
    output: string,
    composition: ValidationComposition,
    context: ConditionContext
  ): boolean {
    // Handle AND operator
    if (composition.and) {
      return composition.and.every(criteria => 
        this.evaluateSingleCriteria(output, criteria, context)
      );
    }

    // Handle OR operator
    if (composition.or) {
      return composition.or.some(criteria => 
        this.evaluateSingleCriteria(output, criteria, context)
      );
    }

    // Handle NOT operator
    if (composition.not) {
      return !this.evaluateSingleCriteria(output, composition.not, context);
    }

    // Empty composition is considered valid
    return true;
  }

  /**
   * Evaluates a single validation criteria (rule or composition).
   * 
   * @param output - The step output to validate
   * @param criteria - Single validation criteria to evaluate
   * @param context - Execution context for conditional validation
   * @returns Boolean indicating if the criteria is valid
   */
  private evaluateSingleCriteria(
    output: string,
    criteria: ValidationCriteria,
    context: ConditionContext
  ): boolean {
    if (this.isValidationRule(criteria)) {
      // Check if rule condition is met (if condition exists)
      if (criteria.condition && !evaluateCondition(criteria.condition, context)) {
        // Skip this rule if condition is not met (consider as valid)
        return true;
      }

      const issues: string[] = [];
      this.evaluateRule(output, criteria, issues);
      return issues.length === 0;
    }

    if (this.isValidationComposition(criteria)) {
      return this.evaluateComposition(output, criteria, context);
    }

    throw new ValidationError('Invalid validation criteria type');
  }

  /**
   * Type guard to check if criteria is a ValidationRule.
   */
  private isValidationRule(criteria: ValidationCriteria): criteria is ValidationRule {
    return typeof criteria === 'object' && 'type' in criteria;
  }

  /**
   * Type guard to check if criteria is a ValidationComposition.
   */
  private isValidationComposition(criteria: ValidationCriteria): criteria is ValidationComposition {
    return typeof criteria === 'object' && 
           !('type' in criteria) &&
           (Object.keys(criteria).length === 0 || 
            'and' in criteria || 'or' in criteria || 'not' in criteria);
  }
  
  /**
   * Validates a step output against validation criteria.
   * 
   * @param output - The step output to validate
   * @param criteria - Array of validation rules or composition object to apply
   * @param context - Optional context for context-aware validation
   * @returns ValidationResult with validation status and any issues
   */
  async validate(
    output: string,
    criteria: ValidationRule[] | ValidationComposition,
    context?: ConditionContext
  ): Promise<ValidationResult> {
    const issues: string[] = [];

    // Handle empty or invalid criteria
    if (!criteria || (Array.isArray(criteria) && criteria.length === 0)) {
      // Fallback basic validation - output should not be empty
      if (typeof output !== 'string' || output.trim().length === 0) {
        issues.push('Output is empty or invalid.');
      }
      return {
        valid: issues.length === 0,
        issues,
        suggestions: issues.length > 0 ? ['Provide valid output content.'] : []
      };
    }

    // Evaluate criteria (either array format or composition format)
    const isValid = this.evaluateCriteria(output, criteria, context || {});
    
    if (!isValid.valid) {
      issues.push(...isValid.issues);
    }

    const valid = issues.length === 0;
    return {
      valid,
      issues,
      suggestions: valid ? [] : ['Review validation criteria and adjust output accordingly.']
    };
  }

  /**
   * Evaluates a single validation rule against the output.
   * 
   * @param output - The step output to validate
   * @param rule - The validation rule to apply
   * @param issues - Array to collect validation issues
   */
  private evaluateRule(output: string, rule: ValidationRule, issues: string[]): void {
    // Handle legacy string-based rules for backward compatibility
    if (typeof rule === 'string') {
      const re = new RegExp(rule);
      if (!re.test(output)) {
        issues.push(`Output does not match pattern: ${rule}`);
      }
      return;
    }

    // Handle object-based rules
    if (rule && typeof rule === 'object') {
      switch (rule.type) {
        case 'contains': {
          const value = rule.value as string;
          if (typeof value !== 'string' || !output.includes(value)) {
            issues.push(rule.message || `Output must include "${value}"`);
          }
          break;
        }
        case 'regex': {
          try {
            const re = new RegExp(rule.pattern!, rule.flags || undefined);
            if (!re.test(output)) {
              issues.push(rule.message || `Pattern mismatch: ${rule.pattern}`);
            }
          } catch {
            throw new ValidationError(`Invalid regex pattern in validationCriteria: ${rule.pattern}`);
          }
          break;
        }
        case 'length': {
          const { min, max } = rule;
          if (typeof min === 'number' && output.length < min) {
            issues.push(rule.message || `Output shorter than minimum length ${min}`);
          }
          if (typeof max === 'number' && output.length > max) {
            issues.push(rule.message || `Output exceeds maximum length ${max}`);
          }
          break;
        }
        case 'schema': {
          if (!rule.schema) {
            issues.push(rule.message || 'Schema validation rule requires a schema property');
            break;
          }
          
          try {
            // Parse the output as JSON
            let parsedOutput;
            try {
              parsedOutput = JSON.parse(output);
            } catch (parseError: any) {
              issues.push(rule.message || 'Output is not valid JSON for schema validation');
              break;
            }
            
            // Compile and validate against the schema
            const validate = this.compileSchema(rule.schema);
            const isValid = validate(parsedOutput);
            
            if (!isValid) {
              // Format AJV errors for better readability
              const errorMessages = validate.errors?.map((error: any) => 
                `Validation Error at '${error.instancePath}': ${error.message}`
              ) || ['Schema validation failed'];
              
              issues.push(rule.message || errorMessages.join('; '));
            }
          } catch (error: any) {
            // Handle schema compilation errors
            if (error instanceof ValidationError) {
              throw error;
            }
            throw new ValidationError(`Schema validation error: ${error}`);
          }
          break;
        }
        default:
          throw new ValidationError(`Unsupported validation rule type: ${(rule as any).type}`);
      }
      return;
    }

    // Unknown rule format
    throw new ValidationError('Invalid validationCriteria format.');
  }
} 