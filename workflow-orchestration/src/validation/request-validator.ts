import Ajv, { ValidateFunction } from 'ajv';
import { methodParamSchemas } from './schemas';
import { ValidationError } from '../core/error-handler';

class RequestValidator {
  private ajv = new Ajv({ allErrors: true, strict: false });
  private compiled = new Map<string, ValidateFunction>();

  constructor() {
    for (const [method, schema] of Object.entries(methodParamSchemas)) {
      this.compiled.set(method, this.ajv.compile(schema));
    }
  }

  validate(method: string, params: unknown): void {
    const validator = this.compiled.get(method);
    if (!validator) {
      // No schema registered – treat as allowed (for e.g., mcp handshake commands)
      return;
    }
    const valid = validator(params);
    if (!valid) {
      throw new ValidationError('Invalid parameters', undefined, validator.errors);
    }
  }
}

export const requestValidator = new RequestValidator(); 