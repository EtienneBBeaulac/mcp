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

  describe('schema validation', () => {
    it('should handle schema rule without schema property', async () => {
      const rules: ValidationRule[] = [
        { type: 'schema', message: 'Schema validation failed' }
      ];
      const result = await engine.validate('hello world', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Schema validation failed');
    });

    it('should validate valid JSON against object schema', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { 
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            },
            required: ['name', 'age']
          }, 
          message: 'Object schema validation failed' 
        }
      ];
      const validJson = '{"name": "John", "age": 30}';
      const result = await engine.validate(validJson, rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for invalid JSON against object schema', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { 
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            },
            required: ['name', 'age']
          }, 
          message: 'Object schema validation failed' 
        }
      ];
      const invalidJson = '{"name": "John"}'; // missing required 'age'
      const result = await engine.validate(invalidJson, rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Object schema validation failed');
    });

    it('should handle non-JSON input for schema validation', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { type: 'object' }, 
          message: 'Invalid JSON input' 
        }
      ];
      const result = await engine.validate('not json', rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Invalid JSON input');
    });

    it('should validate array schema', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { 
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }, 
          message: 'Array schema validation failed' 
        }
      ];
      const validJson = '["apple", "banana", "cherry"]';
      const result = await engine.validate(validJson, rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for invalid array schema', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { 
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }, 
          message: 'Array schema validation failed' 
        }
      ];
      const invalidJson = '[]'; // empty array, but minItems is 1
      const result = await engine.validate(invalidJson, rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Array schema validation failed');
    });

    it('should provide detailed AJV error messages when custom message not provided', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { 
            type: 'object',
            properties: {
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'] }
            },
            required: ['priority']
          },
          message: '' // Use empty message to test default AJV error formatting
        }
      ];
      const invalidJson = '{"priority": "Invalid"}';
      const result = await engine.validate(invalidJson, rules);
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('Validation Error at');
      expect(result.issues[0]).toContain('priority');
    });

    it('should cache compiled schemas for performance', async () => {
      const schema = { 
        type: 'object',
        properties: { name: { type: 'string' } }
      };
      const rules: ValidationRule[] = [
        { type: 'schema', schema, message: 'Schema validation failed' }
      ];
      
      // First validation - should compile and cache
      const result1 = await engine.validate('{"name": "test"}', rules);
      expect(result1.valid).toBe(true);
      
      // Second validation with same schema - should use cache
      const result2 = await engine.validate('{"name": "test2"}', rules);
      expect(result2.valid).toBe(true);
      
      // Verify both validations worked correctly
      expect(result1.issues).toHaveLength(0);
      expect(result2.issues).toHaveLength(0);
    });

    it('should handle invalid JSON schema definition', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { 
            type: 'invalid_type' // invalid schema type
          }, 
          message: 'Schema validation failed' 
        }
      ];
      
      await expect(engine.validate('{"test": "value"}', rules))
        .rejects.toThrow('Invalid JSON schema');
    });

    it('should handle multiple schema validations', async () => {
      const rules: ValidationRule[] = [
        { 
          type: 'schema', 
          schema: { type: 'object' }, 
          message: 'Must be object' 
        },
        { 
          type: 'schema', 
          schema: { 
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name']
          }, 
          message: 'Must have name property' 
        }
      ];
      
      const validJson = '{"name": "John"}';
      const result = await engine.validate(validJson, rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle basic JSON types validation', async () => {
      // Test string validation
      const stringRules: ValidationRule[] = [
        { type: 'schema', schema: { type: 'string' }, message: 'Must be string' }
      ];
      const stringResult = await engine.validate('"hello"', stringRules);
      expect(stringResult.valid).toBe(true);
      
      // Test number validation
      const numberRules: ValidationRule[] = [
        { type: 'schema', schema: { type: 'number' }, message: 'Must be number' }
      ];
      const numberResult = await engine.validate('42', numberRules);
      expect(numberResult.valid).toBe(true);
      
      // Test boolean validation
      const booleanRules: ValidationRule[] = [
        { type: 'schema', schema: { type: 'boolean' }, message: 'Must be boolean' }
      ];
      const booleanResult = await engine.validate('true', booleanRules);
      expect(booleanResult.valid).toBe(true);
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