import { describe, it, expect, beforeEach } from '@jest/globals';
import { ValidationEngine, ValidationRule } from '../../src/application/services/validation-engine';
import { ValidationError } from '../../src/core/error-handler';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  describe('basic validation', () => {
    it('should validate empty criteria with non-empty output', async () => {
      const result = await engine.validate('some output', []);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should fail validation with empty criteria and empty output', async () => {
      const result = await engine.validate('', []);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Output is empty or invalid.');
      expect(result.suggestions).toContain('Provide valid output content.');
    });

    it('should fail validation with empty criteria and whitespace-only output', async () => {
      const result = await engine.validate('   \n\t  ', []);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Output is empty or invalid.');
    });
  });

  describe('contains validation', () => {
    it('should pass when output contains required value', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', value: 'hello', message: 'Must contain hello' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when output does not contain required value', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', value: 'goodbye', message: 'Must contain goodbye' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Must contain goodbye');
    });

    it('should use default message when none provided', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', value: 'missing', message: '' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Output must include "missing"');
    });

    it('should handle undefined value', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', message: 'Must contain value' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Must contain value');
    });
  });

  describe('regex validation', () => {
    it('should pass when output matches regex pattern', async () => {
      const rules: ValidationRule[] = [
        { type: 'regex', pattern: '^hello.*world$', message: 'Must match pattern' }
      ];
      const result = await engine.validate('hello beautiful world', rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when output does not match regex pattern', async () => {
      const rules: ValidationRule[] = [
        { type: 'regex', pattern: '^goodbye.*world$', message: 'Must match pattern' }
      ];
      const result = await engine.validate('hello beautiful world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Must match pattern');
    });

    it('should support regex flags', async () => {
      const rules: ValidationRule[] = [
        { type: 'regex', pattern: 'HELLO', flags: 'i', message: 'Must match case-insensitive' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should use default message when none provided', async () => {
      const rules: ValidationRule[] = [
        { type: 'regex', pattern: 'missing', message: '' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Pattern mismatch: missing');
    });

    it('should throw ValidationError for invalid regex pattern', async () => {
      const rules: ValidationRule[] = [
        { type: 'regex', pattern: '[invalid', message: 'Invalid regex' }
      ];
      await expect(engine.validate('hello world', rules)).rejects.toThrow(ValidationError);
    });
  });

  describe('length validation', () => {
    it('should pass when output length is within bounds', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', min: 5, max: 15, message: 'Must be 5-15 characters' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when output is too short', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', min: 15, message: 'Too short' }
      ];
      const result = await engine.validate('hello', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Too short');
    });

    it('should fail when output is too long', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', max: 5, message: 'Too long' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Too long');
    });

    it('should use default message for min length', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', min: 15, message: '' }
      ];
      const result = await engine.validate('hello', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Output shorter than minimum length 15');
    });

    it('should use default message for max length', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', max: 5, message: '' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Output exceeds maximum length 5');
    });

    it('should handle only min constraint', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', min: 5, message: 'Must be at least 5 characters' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(true);
    });

    it('should handle only max constraint', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', max: 15, message: 'Must be at most 15 characters' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(true);
    });
  });

  describe('legacy string-based rules', () => {
    it('should support legacy string regex rules', async () => {
      const rules: any[] = ['hello.*world'];
      const result = await engine.validate('hello beautiful world', rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail legacy string regex rules that do not match', async () => {
      const rules: any[] = ['goodbye.*world'];
      const result = await engine.validate('hello beautiful world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Output does not match pattern: goodbye.*world');
    });
  });

  describe('multiple validation rules', () => {
    it('should pass when all rules pass', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', value: 'hello', message: 'Must contain hello' },
        { type: 'length', min: 5, max: 20, message: 'Must be 5-20 characters' },
        { type: 'regex', pattern: 'world$', message: 'Must end with world' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when any rule fails', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', value: 'hello', message: 'Must contain hello' },
        { type: 'contains', value: 'missing', message: 'Must contain missing' },
        { type: 'length', min: 5, max: 20, message: 'Must be 5-20 characters' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Must contain missing');
      expect(result.issues).toHaveLength(1); // Only the failing rule
    });

    it('should collect all failing rules', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', value: 'missing1', message: 'Must contain missing1' },
        { type: 'contains', value: 'missing2', message: 'Must contain missing2' },
        { type: 'length', min: 50, message: 'Must be at least 50 characters' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(3);
      expect(result.issues).toContain('Must contain missing1');
      expect(result.issues).toContain('Must contain missing2');
      expect(result.issues).toContain('Must be at least 50 characters');
    });
  });

  describe('error handling', () => {
    it('should throw ValidationError for unsupported rule type', async () => {
      const rules: any[] = [
        { type: 'unsupported', message: 'Unsupported rule' }
      ];
      await expect(engine.validate('hello world', rules)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid rule format', async () => {
      const rules: any[] = [42]; // Invalid rule format
      await expect(engine.validate('hello world', rules)).rejects.toThrow(ValidationError);
    });

    it('should provide appropriate suggestions for failed validation', async () => {
      const rules: ValidationRule[] = [
        { type: 'contains', value: 'missing', message: 'Must contain missing' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.suggestions).toContain('Review validation criteria and adjust output accordingly.');
    });
  });

  describe('schema validation (placeholder)', () => {
    it('should handle schema rule without schema property', async () => {
      const rules: ValidationRule[] = [
        { type: 'schema', message: 'Schema validation failed' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Schema validation failed');
    });

    it('should handle schema rule with schema property (placeholder)', async () => {
      const rules: ValidationRule[] = [
        { type: 'schema', schema: { type: 'object' }, message: 'Schema validation failed' }
      ];
      const result = await engine.validate('{"test": "value"}', rules);
      expect(result.valid).toBe(true); // Placeholder implementation accepts all
    });
  });

  describe('edge cases', () => {
    it('should handle null criteria', async () => {
      const result = await engine.validate('hello world', null as any);
      expect(result.valid).toBe(true);
    });

    it('should handle undefined criteria', async () => {
      const result = await engine.validate('hello world', undefined as any);
      expect(result.valid).toBe(true);
    });

    it('should handle empty string output with valid criteria', async () => {
      const rules: ValidationRule[] = [
        { type: 'length', min: 0, message: 'Must be at least 0 characters' }
      ];
      const result = await engine.validate('', rules);
      expect(result.valid).toBe(true);
    });

    it('should handle very long output', async () => {
      const longOutput = 'a'.repeat(10000);
      const rules: ValidationRule[] = [
        { type: 'length', min: 5000, message: 'Must be at least 5000 characters' }
      ];
      const result = await engine.validate(longOutput, rules);
      expect(result.valid).toBe(true);
    });

    it('should handle special characters in regex', async () => {
      const rules: ValidationRule[] = [
        { type: 'regex', pattern: '\\$\\d+\\.\\d{2}', message: 'Must be currency format' }
      ];
      const result = await engine.validate('$123.45', rules);
      expect(result.valid).toBe(true);
    });
  });
}); 