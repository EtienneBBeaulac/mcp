import { WorkflowValidateRequest, WorkflowValidateResponse } from '../types/mcp-types';
import { fileWorkflowStorage } from '../workflow/storage';
import { WorkflowNotFoundError, StepNotFoundError } from '../core/error-handler';
import { ValidationError } from '../core/error-handler';

export async function workflowValidateHandler(
  request: WorkflowValidateRequest
): Promise<WorkflowValidateResponse> {
  const workflow = fileWorkflowStorage.getWorkflowById(request.params.workflowId);
  if (!workflow) {
    throw new WorkflowNotFoundError(request.params.workflowId);
  }
  const step = workflow.steps.find(s => s.id === request.params.stepId);
  if (!step) {
    throw new StepNotFoundError(request.params.stepId, request.params.workflowId);
  }
  const { output } = request.params;

  // ------------------------------------------------------------------
  // SIMPLE VALIDATION ENGINE
  // Supports rule formats:
  //   1) String  → treated as regex pattern that must match output
  //   2) Object with { type: 'contains' | 'regex' | 'length', ... }
  // ------------------------------------------------------------------

  const issues: string[] = [];

  const criteria = (step as any).validationCriteria as unknown;

  const evaluateRule = (rule: any) => {
    if (typeof rule === 'string') {
      const re = new RegExp(rule);
      if (!re.test(output)) {
        issues.push(`Output does not match pattern: ${rule}`);
      }
      return;
    }

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
            const re = new RegExp(rule.pattern, rule.flags || undefined);
            if (!re.test(output)) {
              issues.push(rule.message || `Pattern mismatch: ${rule.pattern}`);
            }
          } catch (err) {
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
        default:
          throw new ValidationError(`Unsupported validation rule type: ${rule.type}`);
      }
      return;
    }

    // Unknown rule format
    throw new ValidationError('Invalid validationCriteria format.');
  };

  if (Array.isArray(criteria) && criteria.length > 0) {
    criteria.forEach(evaluateRule);
  } else {
    // Fallback basic validation
    if (typeof output !== 'string' || output.trim().length === 0) {
      issues.push('Output is empty or invalid.');
    }
  }

  const valid = issues.length === 0;

  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      valid,
      issues,
      suggestions: valid ? [] : ['Review validation criteria and adjust output accordingly.']
    }
  };
} 