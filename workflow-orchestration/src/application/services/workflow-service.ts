export interface WorkflowService {
  /** Return lightweight summaries of all workflows. */
  listWorkflowSummaries(): Promise<import('../../types/mcp-types').WorkflowSummary[]>;

  /** Retrieve a workflow by ID, or null if not found. */
  getWorkflowById(id: string): Promise<import('../../types/mcp-types').Workflow | null>;

  /**
   * Determine the next step in a workflow given completed step IDs.
   */
  getNextStep(
    workflowId: string,
    completedSteps: string[]
  ): Promise<{
    step: import('../../types/mcp-types').WorkflowStep | null;
    guidance: import('../../types/mcp-types').WorkflowGuidance;
    isComplete: boolean;
  }>;

  /** Validate an output for a given step. */
  validateStepOutput(
    workflowId: string,
    stepId: string,
    output: string
  ): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
  }>;
}

import {
  Workflow,
  WorkflowSummary,
  WorkflowStep,
  WorkflowGuidance
} from '../../types/mcp-types';
import { createDefaultWorkflowStorage } from '../../infrastructure/storage';
import { IWorkflowStorage } from '../../types/storage';
import {
  WorkflowNotFoundError,
  StepNotFoundError,
  ValidationError
} from '../../core/error-handler';

/**
 * Default implementation of {@link WorkflowService} that relies on
 * the existing {@link FileWorkflowStorage} backend.
 */
export class DefaultWorkflowService implements WorkflowService {
  constructor(private readonly storage: IWorkflowStorage = createDefaultWorkflowStorage()) {}

  async listWorkflowSummaries(): Promise<WorkflowSummary[]> {
    return this.storage.listWorkflowSummaries();
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    return this.storage.getWorkflowById(id);
  }

  async getNextStep(
    workflowId: string,
    completedSteps: string[]
  ): Promise<{ step: WorkflowStep | null; guidance: WorkflowGuidance; isComplete: boolean }> {
    const workflow = await this.storage.getWorkflowById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const completed = completedSteps || [];
    const nextStep = workflow.steps.find((step) => !completed.includes(step.id)) || null;
    const isComplete = !nextStep;

    return {
      step: nextStep,
      guidance: {
        prompt: nextStep ? nextStep.prompt : 'Workflow complete.'
      },
      isComplete
    };
  }

  async validateStepOutput(
    workflowId: string,
    stepId: string,
    output: string
  ): Promise<{ valid: boolean; issues: string[]; suggestions: string[] }> {
    const workflow = await this.storage.getWorkflowById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new StepNotFoundError(stepId, workflowId);
    }

    // Validation logic (moved from workflow_validate handler)
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
      valid,
      issues,
      suggestions: valid ? [] : ['Review validation criteria and adjust output accordingly.']
    };
  }
}

// Legacy singleton – retained for backwards compatibility. New code should
// prefer explicit instantiation and dependency injection.
export const defaultWorkflowService: WorkflowService = new DefaultWorkflowService(); 