import { IApplicationMediator } from '../../src/application/app';
import { SimpleOutputDecorator } from '../../src/application/decorators/simple-output-decorator';

describe('SimpleOutputDecorator', () => {
  let mockMediator: jest.Mocked<IApplicationMediator>;
  let decorator: SimpleOutputDecorator;

  beforeEach(() => {
    // Create a mock IApplicationMediator
    mockMediator = {
      execute: jest.fn(),
      register: jest.fn(),
      setResponseValidator: jest.fn()
    } as any;

    decorator = new SimpleOutputDecorator(mockMediator);
  });

  describe('execute', () => {
    it('should append optimization text to workflow_next responses with guidance', async () => {
      // Arrange
      const mockResponse = {
        step: { id: 'test-step' },
        guidance: {
          prompt: 'Original prompt text'
        },
        isComplete: false
      };
      mockMediator.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await decorator.execute('workflow_next', { workflowId: 'test' });

      // Assert
      expect(result.guidance.prompt).toContain('Original prompt text');
      expect(result.guidance.prompt).toContain('CONTEXT OPTIMIZATION REQUIREMENTS');
      expect(result.guidance.prompt).toContain('The MCP server is STATELESS');
      expect(mockMediator.execute).toHaveBeenCalledWith('workflow_next', { workflowId: 'test' });
    });

    it('should not modify workflow_next responses without guidance', async () => {
      // Arrange
      const mockResponse = {
        step: null,
        isComplete: true
      };
      mockMediator.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await decorator.execute('workflow_next', { workflowId: 'test' });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.guidance).toBeUndefined();
    });

    it('should pass through non-workflow_next methods unchanged', async () => {
      // Arrange
      const mockResponse = { workflows: [{ id: 'test', name: 'Test' }] };
      mockMediator.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await decorator.execute('workflow_list', {});

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockMediator.execute).toHaveBeenCalledWith('workflow_list', {});
    });

    it('should maintain immutability of original response', async () => {
      // Arrange
      const originalResponse = {
        step: { id: 'test-step' },
        guidance: {
          prompt: 'Original prompt'
        }
      };
      const mockResponse = { ...originalResponse };
      mockMediator.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await decorator.execute('workflow_next', {});

      // Assert
      expect(result).not.toBe(mockResponse);
      expect(result.guidance).not.toBe(mockResponse.guidance);
      expect(mockResponse.guidance.prompt).toBe('Original prompt'); // Original unchanged
    });
  });

  describe('register', () => {
    it('should delegate to wrapped mediator', () => {
      // Arrange
      const handler = jest.fn();

      // Act
      decorator.register('test_method', handler);

      // Assert
      expect(mockMediator.register).toHaveBeenCalledWith('test_method', handler);
    });
  });

  describe('setResponseValidator', () => {
    it('should delegate to wrapped mediator', () => {
      // Arrange
      const validator = jest.fn();

      // Act
      decorator.setResponseValidator(validator);

      // Assert
      expect(mockMediator.setResponseValidator).toHaveBeenCalledWith(validator);
    });
  });
});