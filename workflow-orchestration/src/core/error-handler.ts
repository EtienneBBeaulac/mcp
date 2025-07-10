// MCP Server Error Handling System
// Comprehensive error handling with proper MCP error codes and recovery

import { MCPErrorCodes, JSONRPCError, JSONRPCResponse } from '../types/mcp-types';

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class MCPError extends Error {
  public readonly code: number;
  public readonly data?: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;
  }
}

export class WorkflowNotFoundError extends MCPError {
  constructor(workflowId: string) {
    super(
      MCPErrorCodes.WORKFLOW_NOT_FOUND,
      `Workflow with id '${workflowId}' not found`,
      { workflowId }
    );
    this.name = 'WorkflowNotFoundError';
  }
}

export class InvalidWorkflowError extends MCPError {
  constructor(workflowId: string, details: string) {
    super(
      MCPErrorCodes.INVALID_WORKFLOW,
      `Invalid workflow: ${workflowId}`,
      { workflowId, details }
    );
    this.name = 'InvalidWorkflowError';
  }
}

export class StepNotFoundError extends MCPError {
  constructor(stepId: string, workflowId?: string) {
    super(
      MCPErrorCodes.STEP_NOT_FOUND,
      `Step with id '${stepId}' not found in workflow`,
      { stepId, workflowId }
    );
    this.name = 'StepNotFoundError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, field?: string, details?: any) {
    super(
      MCPErrorCodes.VALIDATION_ERROR,
      message,
      { field, details }
    );
    this.name = 'ValidationError';
  }
}

export class StateError extends MCPError {
  constructor(message: string, executionId?: string) {
    super(
      MCPErrorCodes.STATE_ERROR,
      message,
      { executionId }
    );
    this.name = 'StateError';
  }
}

export class StorageError extends MCPError {
  constructor(message: string, operation?: string) {
    super(
      MCPErrorCodes.STORAGE_ERROR,
      message,
      { operation }
    );
    this.name = 'StorageError';
  }
}

export class SecurityError extends MCPError {
  constructor(message: string, action?: string) {
    super(
      MCPErrorCodes.SECURITY_ERROR,
      message,
      { action }
    );
    this.name = 'SecurityError';
  }
}

// =============================================================================
// ERROR HANDLER CLASS
// =============================================================================

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: any; // Will be replaced with actual logger

  private constructor() {
    // Initialize error handler
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Convert any error to a proper MCP error response
   */
  public handleError(error: Error, requestId: string | number | null): JSONRPCResponse {
    let mcpError: MCPError;

    // Convert to MCP error if not already
    if (error instanceof MCPError) {
      mcpError = error;
    } else {
      // Handle different error types
      mcpError = this.convertToMCPError(error);
    }

    // Log the error
    this.logError(mcpError);

    // Create error response
    const errorResponse: JSONRPCResponse = {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: mcpError.code,
        message: mcpError.message,
        data: mcpError.data
      }
    };

    return errorResponse;
  }

  /**
   * Convert generic errors to MCP errors
   */
  private convertToMCPError(error: Error): MCPError {
    // Handle common error patterns
    if (error.message.includes('not found')) {
      return new MCPError(
        MCPErrorCodes.METHOD_NOT_FOUND,
        error.message,
        { originalError: error.name }
      );
    }

    if (error.message.includes('validation')) {
      return new ValidationError(
        error.message,
        undefined,
        { originalError: error.name }
      );
    }

    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return new SecurityError(
        error.message,
        'access_denied'
      );
    }

    // Default to internal error
    return new MCPError(
      MCPErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      { originalError: error.message }
    );
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(error: MCPError): void {
    const logEntry = {
      timestamp: new Date(),
      level: 'error',
      error: {
        name: error.name,
        code: error.code,
        message: error.message,
        data: error.data,
        stack: error.stack
      }
    };

    // TODO: Replace with actual logger
    console.error('MCP Error:', logEntry);
  }

  /**
   * Create a parse error response
   */
  public createParseError(): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: MCPErrorCodes.PARSE_ERROR,
        message: "Parse error",
        data: { details: "Invalid JSON was received" }
      }
    };
  }

  /**
   * Create an invalid request error response
   */
  public createInvalidRequestError(requestId: string | number | null): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: MCPErrorCodes.INVALID_REQUEST,
        message: "Invalid Request",
        data: { details: "The JSON sent is not a valid Request object" }
      }
    };
  }

  /**
   * Create a method not found error response
   */
  public createMethodNotFoundError(method: string, requestId: string | number | null): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: MCPErrorCodes.METHOD_NOT_FOUND,
        message: "Method not found",
        data: { method }
      }
    };
  }

  /**
   * Create an invalid params error response
   */
  public createInvalidParamsError(details: string, requestId: string | number | null): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: MCPErrorCodes.INVALID_PARAMS,
        message: "Invalid params",
        data: { details }
      }
    };
  }

  /**
   * Validate and sanitize error data
   */
  public sanitizeErrorData(data: any): any {
    if (!data) return undefined;

    // Remove sensitive information
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get error recovery suggestions
   */
  public getErrorRecoverySuggestions(error: MCPError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case MCPErrorCodes.WORKFLOW_NOT_FOUND:
        suggestions.push(
          "Check if the workflow ID is correct",
          "Verify the workflow exists in the storage",
          "Try listing available workflows first"
        );
        break;

      case MCPErrorCodes.INVALID_WORKFLOW:
        suggestions.push(
          "Validate the workflow JSON against the schema",
          "Check for required fields and proper formatting",
          "Ensure all step IDs are unique"
        );
        break;

      case MCPErrorCodes.STEP_NOT_FOUND:
        suggestions.push(
          "Verify the step ID exists in the workflow",
          "Check the workflow definition for the correct step ID",
          "Ensure the workflow is properly loaded"
        );
        break;

      case MCPErrorCodes.WORKFLOW_NOT_FOUND:
        suggestions.push(
          "Check if the workflow ID is correct",
          "Verify the workflow exists in the storage",
          "List available workflows to confirm the ID"
        );
        break;

      case MCPErrorCodes.VALIDATION_ERROR:
        suggestions.push(
          "Check the input parameters against the schema",
          "Verify all required fields are provided",
          "Ensure data types match the expected format"
        );
        break;

      case MCPErrorCodes.STATE_ERROR:
        suggestions.push(
          "Check if the workflow execution exists",
          "Verify the execution state is valid",
          "Try restarting the workflow execution"
        );
        break;

      case MCPErrorCodes.STORAGE_ERROR:
        suggestions.push(
          "Check file system permissions",
          "Verify storage path is accessible",
          "Ensure sufficient disk space"
        );
        break;

      case MCPErrorCodes.SECURITY_ERROR:
        suggestions.push(
          "Verify authentication credentials",
          "Check API key permissions",
          "Ensure proper authorization"
        );
        break;

      default:
        suggestions.push(
          "Check the server logs for more details",
          "Verify the request format is correct",
          "Try the request again"
        );
    }

    return suggestions;
  }

  /**
   * Check if error is recoverable
   */
  public isRecoverableError(error: MCPError): boolean {
    const recoverableCodes = [
      MCPErrorCodes.WORKFLOW_NOT_FOUND,
      MCPErrorCodes.STEP_NOT_FOUND,
      MCPErrorCodes.VALIDATION_ERROR,
      MCPErrorCodes.INVALID_PARAMS
    ];

    return recoverableCodes.includes(error.code);
  }

  /**
   * Get error severity level
   */
  public getErrorSeverity(error: MCPError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.code) {
      case MCPErrorCodes.PARSE_ERROR:
      case MCPErrorCodes.INVALID_REQUEST:
        return 'low';

      case MCPErrorCodes.METHOD_NOT_FOUND:
      case MCPErrorCodes.INVALID_PARAMS:
      case MCPErrorCodes.WORKFLOW_NOT_FOUND:
      case MCPErrorCodes.STEP_NOT_FOUND:
      case MCPErrorCodes.VALIDATION_ERROR:
        return 'medium';

      case MCPErrorCodes.STATE_ERROR:
      case MCPErrorCodes.STORAGE_ERROR:
        return 'high';

      case MCPErrorCodes.INTERNAL_ERROR:
      case MCPErrorCodes.SECURITY_ERROR:
        return 'critical';

      default:
        return 'medium';
    }
  }
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

export const errorHandler = ErrorHandler.getInstance();

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: number,
  message: string,
  requestId: string | number | null,
  data?: any
): JSONRPCResponse {
  return {
    jsonrpc: "2.0",
    id: requestId,
    error: {
      code,
      message,
      data: errorHandler.sanitizeErrorData(data)
    }
  };
}

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  requestId: string | number | null
): (...args: T) => Promise<R | JSONRPCResponse> {
  return async (...args: T): Promise<R | JSONRPCResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorHandler.handleError(error as Error, requestId);
    }
  };
}

/**
 * Validate request structure
 */
export function validateRequest(request: any): { valid: boolean; error?: JSONRPCResponse } {
  if (!request || typeof request !== 'object') {
    return {
      valid: false,
      error: errorHandler.createInvalidRequestError(null)
    };
  }

  if (request.jsonrpc !== "2.0") {
    return {
      valid: false,
      error: errorHandler.createInvalidRequestError(request.id)
    };
  }

  if (!request.method || typeof request.method !== 'string') {
    return {
      valid: false,
      error: errorHandler.createInvalidRequestError(request.id)
    };
  }

  return { valid: true };
} 