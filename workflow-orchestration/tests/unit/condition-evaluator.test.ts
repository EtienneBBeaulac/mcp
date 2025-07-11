import { evaluateCondition, validateCondition } from '../../src/utils/condition-evaluator';

describe('Condition Evaluator', () => {
  describe('evaluateCondition', () => {
    it('should return true for null/undefined conditions', () => {
      expect(evaluateCondition(null)).toBe(true);
      expect(evaluateCondition(undefined)).toBe(true);
      expect(evaluateCondition({})).toBe(true);
    });

    it('should evaluate simple variable conditions', () => {
      const context = { taskScope: 'small', userLevel: 'expert' };
      
      expect(evaluateCondition({ var: 'taskScope', equals: 'small' }, context)).toBe(true);
      expect(evaluateCondition({ var: 'taskScope', equals: 'large' }, context)).toBe(false);
      expect(evaluateCondition({ var: 'userLevel', not_equals: 'novice' }, context)).toBe(true);
      expect(evaluateCondition({ var: 'userLevel', not_equals: 'expert' }, context)).toBe(false);
    });

    it('should evaluate numeric comparisons', () => {
      const context = { complexity: 0.7, score: 85 };
      
      expect(evaluateCondition({ var: 'complexity', gt: 0.5 }, context)).toBe(true);
      expect(evaluateCondition({ var: 'complexity', gt: 0.8 }, context)).toBe(false);
      expect(evaluateCondition({ var: 'complexity', gte: 0.7 }, context)).toBe(true);
      expect(evaluateCondition({ var: 'score', lt: 100 }, context)).toBe(true);
      expect(evaluateCondition({ var: 'score', lte: 85 }, context)).toBe(true);
      expect(evaluateCondition({ var: 'score', lte: 80 }, context)).toBe(false);
    });

    it('should evaluate logical operators', () => {
      const context = { taskScope: 'large', userLevel: 'expert', complexity: 0.8 };
      
      expect(evaluateCondition({
        and: [
          { var: 'taskScope', equals: 'large' },
          { var: 'userLevel', equals: 'expert' }
        ]
      }, context)).toBe(true);
      
      expect(evaluateCondition({
        or: [
          { var: 'taskScope', equals: 'small' },
          { var: 'userLevel', equals: 'expert' }
        ]
      }, context)).toBe(true);
      
      expect(evaluateCondition({
        not: { var: 'taskScope', equals: 'small' }
      }, context)).toBe(true);
    });

    it('should handle missing variables gracefully', () => {
      const context = { taskScope: 'small' };
      
      expect(evaluateCondition({ var: 'nonexistent', equals: 'value' }, context)).toBe(false);
      expect(evaluateCondition({ var: 'nonexistent', gt: 0 }, context)).toBe(false);
    });

    it('should handle invalid conditions safely', () => {
      const context = { taskScope: 'small' };
      
      // Test with invalid condition objects by casting to any
      expect(evaluateCondition({ invalid: 'operator' } as any, context)).toBe(false);
      expect(evaluateCondition({ and: 'not-an-array' } as any, context)).toBe(false);
    });

    it('should evaluate variable truthiness', () => {
      const context = { enabled: true, disabled: false, empty: '', value: 'test' };
      
      expect(evaluateCondition({ var: 'enabled' }, context)).toBe(true);
      expect(evaluateCondition({ var: 'disabled' }, context)).toBe(false);
      expect(evaluateCondition({ var: 'empty' }, context)).toBe(false);
      expect(evaluateCondition({ var: 'value' }, context)).toBe(true);
    });
  });

  describe('validateCondition', () => {
    it('should accept valid conditions', () => {
      expect(() => validateCondition({ var: 'test', equals: 'value' })).not.toThrow();
      expect(() => validateCondition({ and: [{ var: 'a', equals: 1 }] })).not.toThrow();
      expect(() => validateCondition({ or: [{ var: 'a', gt: 0 }, { var: 'b', lt: 10 }] })).not.toThrow();
    });

    it('should reject invalid operators', () => {
      expect(() => validateCondition({ var: 'test', invalid: 'operator' })).toThrow('Unsupported condition operators: invalid');
      expect(() => validateCondition({ badOperator: 'value' })).toThrow('Unsupported condition operators: badOperator');
    });

    it('should validate nested conditions', () => {
      expect(() => validateCondition({
        and: [
          { var: 'a', equals: 1 },
          { or: [{ var: 'b', gt: 0 }, { var: 'c', lt: 10 }] }
        ]
      })).not.toThrow();
      
      expect(() => validateCondition({
        and: [
          { var: 'a', equals: 1 },
          { invalid: 'nested' }
        ]
      })).toThrow('Unsupported condition operators: invalid');
    });
  });
}); 