import { z, ZodTypeAny } from 'zod';
import { ValidationError } from '../core/error-handler';

const idRegex = /^[A-Za-z0-9_-]+$/;

// ---------------------------------------------------------------------------
// Reusable fragments
// ---------------------------------------------------------------------------
const workflowSummarySchema = z.object({
  id: z.string().regex(idRegex),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  version: z.string()
});

const workflowStepSchema = z.object({
  id: z.string().regex(idRegex),
  title: z.string(),
  prompt: z.string(),
  askForFiles: z.boolean().optional(),
  requireConfirmation: z.boolean().optional()
});

const workflowSchema = z.object({
  id: z.string().regex(idRegex),
  name: z.string(),
  description: z.string(),
  preconditions: z.array(z.string()).optional(),
  clarificationPrompts: z.array(z.string()).optional(),
  steps: z.array(workflowStepSchema),
  metaGuidance: z.array(z.string()).optional()
});

// ---------------------------------------------------------------------------
// Method result schemas
// ---------------------------------------------------------------------------
export const methodResultSchemas: Record<string, ZodTypeAny> = {
  // workflow_list → { workflows: WorkflowSummary[] }
  workflow_list: z.object({
    workflows: z.array(workflowSummarySchema)
  }),

  // workflow_get → Workflow object
  workflow_get: workflowSchema,

  // workflow_next → { step, guidance, isComplete }
  workflow_next: z.object({
    step: workflowStepSchema.nullable(),
    guidance: z.object({
      prompt: z.string(),
      modelHint: z.string().optional(),
      requiresConfirmation: z.boolean().optional(),
      validationCriteria: z.array(z.string()).optional()
    }),
    isComplete: z.boolean()
  }),

  // workflow_validate → { valid, issues?, suggestions? }
  workflow_validate: z.object({
    valid: z.boolean(),
    issues: z.array(z.string()).optional(),
    suggestions: z.array(z.string()).optional()
  })
};

// ---------------------------------------------------------------------------
// Validator class
// ---------------------------------------------------------------------------
export class ResponseValidator {
  private readonly compiled: Record<string, ZodTypeAny>;

  constructor(schemas: Record<string, ZodTypeAny>) {
    this.compiled = schemas;
  }

  validate(method: string, result: unknown): void {
    const schema = this.compiled[method];
    if (!schema) return; // no schema means unchecked output

    const parsed = schema.safeParse(result);
    if (!parsed.success) {
      throw new ValidationError('Invalid response', undefined, parsed.error.format());
    }
  }
}

export const responseValidator = new ResponseValidator(methodResultSchemas); 