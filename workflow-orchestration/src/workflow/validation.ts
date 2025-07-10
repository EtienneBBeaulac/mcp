import Ajv, { ValidateFunction } from 'ajv';
import fs from 'fs';
import path from 'path';

const WORKFLOW_SCHEMA_PATH = path.resolve(__dirname, '../../spec/workflow.schema.json');

let validator: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!validator) {
    const schema = JSON.parse(fs.readFileSync(WORKFLOW_SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validator = ajv.compile(schema);
  }
  return validator;
}

export function validateWorkflow(workflow: unknown): { valid: boolean; errors: string[] } {
  const validator = getValidator();
  const valid = validator(workflow);
  return {
    valid: !!valid,
    errors: valid ? [] : (validator.errors || []).map(e => `${e.instancePath} ${e.message}`)
  };
  // TODO: Add richer error reporting and support for custom validation rules
} 