import fs from 'fs';
import path from 'path';
import Ajv, { ValidateFunction } from 'ajv';
import { IWorkflowStorage } from '../types/storage';
import { Workflow } from '../types/mcp-types';
import { InvalidWorkflowError } from '../core/error-handler';

/**
 * Decorator that filters or throws when underlying storage returns workflows
 * that do not conform to the JSON schema.
 */
export class SchemaValidatingWorkflowStorage implements IWorkflowStorage {
  private validator: ValidateFunction;

  constructor(private readonly inner: IWorkflowStorage) {
    const schemaPath = path.resolve(__dirname, '../../spec/workflow.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    this.validator = ajv.compile(schema);
  }

  private ensureValid(workflow: Workflow): boolean {
    const isValid = this.validator(workflow as any);
    if (!isValid) {
      throw new InvalidWorkflowError(
        (workflow as any).id ?? 'unknown',
        JSON.stringify(this.validator.errors)
      );
    }
    return true;
  }

  loadAllWorkflows(): Workflow[] {
    const raw = this.inner.loadAllWorkflows();
    return raw.filter((wf) => {
      try {
        return this.ensureValid(wf);
      } catch {
        return false; // Skip invalid workflows
      }
    });
  }

  getWorkflowById(id: string): Workflow | null {
    const wf = this.inner.getWorkflowById(id);
    if (!wf) return null;
    try {
      this.ensureValid(wf);
      return wf;
    } catch {
      return null;
    }
  }

  listWorkflowSummaries() {
    return this.loadAllWorkflows().map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: 'default',
      version: '1.0.0'
    }));
  }
} 