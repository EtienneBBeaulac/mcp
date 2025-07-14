import { describe, it, expect } from '@jest/globals';
import {
  SessionState,
  SessionHints,
  SessionTier,
  SessionImportance,
  SessionClientType,
  SessionStartResult,
  SessionValidationResult,
  SessionUpdateParams,
  SessionConfig,
  SessionCleanupPolicy,
  SessionError,
  SessionErrorCode,
  DEFAULT_SESSION_CONFIG,
  DEFAULT_CLEANUP_POLICY,
  DEFAULT_SESSION_HINTS
} from '../../src/types/session-types';

describe('SessionTypes', () => {
  describe('Core Session Types', () => {
    it('should create a valid SessionState', () => {
      const sessionState: SessionState = {
        sessionId: 'test-session-123',
        workflowId: 'test-workflow',
        completedSteps: ['step1', 'step2'],
        context: { key: 'value', step: 'step2' },
        createdAt: new Date(),
        lastActivity: new Date(),
        tier: 'memory',
        accessCount: 5,
        hibernationTime: 0,
        hints: {
          importance: 'medium',
          pauseExpected: false,
          clientType: 'human'
        },
        metadata: {
          progress: 50,
          activityFrequency: 2.5,
          memoryFootprint: 1024,
          validationErrors: 0,
          labels: {}
        }
      };

      expect(sessionState.sessionId).toBe('test-session-123');
      expect(sessionState.workflowId).toBe('test-workflow');
      expect(sessionState.completedSteps).toHaveLength(2);
      expect(sessionState.context).toEqual({ key: 'value', step: 'step2' });
      expect(sessionState.tier).toBe('memory');
      expect(sessionState.accessCount).toBe(5);
      expect(sessionState.hints.importance).toBe('medium');
      expect(sessionState.metadata.progress).toBe(50);
    });

    it('should support all session tiers', () => {
      const memoryTier: SessionTier = 'memory';
      const diskTier: SessionTier = 'disk';
      const archiveTier: SessionTier = 'archive';

      expect(memoryTier).toBe('memory');
      expect(diskTier).toBe('disk');
      expect(archiveTier).toBe('archive');
    });

    it('should support all importance levels', () => {
      const low: SessionImportance = 'low';
      const medium: SessionImportance = 'medium';
      const high: SessionImportance = 'high';
      const critical: SessionImportance = 'critical';

      expect(low).toBe('low');
      expect(medium).toBe('medium');
      expect(high).toBe('high');
      expect(critical).toBe('critical');
    });

    it('should support all client types', () => {
      const human: SessionClientType = 'human';
      const agent: SessionClientType = 'agent';
      const scheduled: SessionClientType = 'scheduled';
      const test: SessionClientType = 'test';

      expect(human).toBe('human');
      expect(agent).toBe('agent');
      expect(scheduled).toBe('scheduled');
      expect(test).toBe('test');
    });
  });

  describe('Session Hints', () => {
    it('should create valid session hints with all properties', () => {
      const hints: SessionHints = {
        expectedDuration: 3600000, // 1 hour
        importance: 'high',
        pauseExpected: true,
        clientType: 'agent',
        description: 'AI-driven code review workflow'
      };

      expect(hints.expectedDuration).toBe(3600000);
      expect(hints.importance).toBe('high');
      expect(hints.pauseExpected).toBe(true);
      expect(hints.clientType).toBe('agent');
      expect(hints.description).toBe('AI-driven code review workflow');
    });

    it('should create valid session hints with minimal properties', () => {
      const hints: SessionHints = {
        importance: 'medium',
        pauseExpected: false,
        clientType: 'human'
      };

      expect(hints.importance).toBe('medium');
      expect(hints.pauseExpected).toBe(false);
      expect(hints.clientType).toBe('human');
      expect(hints.expectedDuration).toBeUndefined();
      expect(hints.description).toBeUndefined();
    });
  });

  describe('Session Start Result', () => {
    it('should create valid session start result', () => {
      const result: SessionStartResult = {
        sessionId: 'session-123',
        step: {
          id: 'step1',
          title: 'First Step',
          prompt: 'Please begin the workflow',
          agentRole: 'You are a helpful assistant',
          guidance: ['Follow best practices', 'Be thorough']
        },
        guidance: {
          prompt: 'Combined prompt with guidance'
        },
        isComplete: false,
        config: DEFAULT_SESSION_CONFIG
      };

      expect(result.sessionId).toBe('session-123');
      expect(result.step).not.toBeNull();
      expect(result.step?.id).toBe('step1');
      expect(result.step?.title).toBe('First Step');
      expect(result.step?.guidance).toHaveLength(2);
      expect(result.isComplete).toBe(false);
      expect(result.config).toBe(DEFAULT_SESSION_CONFIG);
    });

    it('should handle empty workflow (no steps)', () => {
      const result: SessionStartResult = {
        sessionId: 'session-123',
        step: null,
        guidance: {
          prompt: 'Workflow complete.'
        },
        isComplete: true,
        config: DEFAULT_SESSION_CONFIG
      };

      expect(result.sessionId).toBe('session-123');
      expect(result.step).toBeNull();
      expect(result.isComplete).toBe(true);
      expect(result.guidance.prompt).toBe('Workflow complete.');
    });
  });

  describe('Session Validation', () => {
    it('should create valid validation result for success', () => {
      const result: SessionValidationResult = {
        valid: true,
        issues: [],
        suggestions: [],
        warnings: []
      };

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should create valid validation result for failure', () => {
      const result: SessionValidationResult = {
        valid: false,
        issues: [
          'Invalid step ID: step-invalid',
          'Context size exceeds limit'
        ],
        suggestions: [
          'Use valid step IDs from the workflow',
          'Reduce context size to under 1MB'
        ],
        warnings: [
          'Session has been inactive for 30 minutes'
        ]
      };

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.suggestions).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('Session Update Parameters', () => {
    it('should create valid update parameters', () => {
      const updates: SessionUpdateParams = {
        completedSteps: ['step3'],
        context: { newKey: 'newValue' },
        hints: { importance: 'high' },
        metadata: { progress: 75 }
      };

      expect(updates.completedSteps).toEqual(['step3']);
      expect(updates.context).toEqual({ newKey: 'newValue' });
      expect(updates.hints?.importance).toBe('high');
      expect(updates.metadata?.progress).toBe(75);
    });

    it('should allow partial updates', () => {
      const updates: SessionUpdateParams = {
        completedSteps: ['step4']
      };

      expect(updates.completedSteps).toEqual(['step4']);
      expect(updates.context).toBeUndefined();
      expect(updates.hints).toBeUndefined();
      expect(updates.metadata).toBeUndefined();
    });
  });

  describe('Session Configuration', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_SESSION_CONFIG.memoryTTL).toBe(2 * 60 * 60 * 1000); // 2 hours
      expect(DEFAULT_SESSION_CONFIG.diskTTL).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(DEFAULT_SESSION_CONFIG.archiveTTL).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(DEFAULT_SESSION_CONFIG.maxMemorySessions).toBe(1000);
      expect(DEFAULT_SESSION_CONFIG.maxDiskSessions).toBe(10000);
      expect(DEFAULT_SESSION_CONFIG.cleanupInterval).toBe(15 * 60 * 1000); // 15 minutes
      expect(DEFAULT_SESSION_CONFIG.adaptiveCleanup).toBe(true);
      expect(DEFAULT_SESSION_CONFIG.security.sessionIdLength).toBe(32);
      expect(DEFAULT_SESSION_CONFIG.security.useSecureRandom).toBe(true);
      expect(DEFAULT_SESSION_CONFIG.security.hashSessionIds).toBe(true);
      expect(DEFAULT_SESSION_CONFIG.security.maxContextSize).toBe(1024 * 1024); // 1MB
      expect(DEFAULT_SESSION_CONFIG.security.validateContext).toBe(true);
    });

    it('should create custom configuration', () => {
      const customConfig: SessionConfig = {
        memoryTTL: 60 * 60 * 1000, // 1 hour
        diskTTL: 12 * 60 * 60 * 1000, // 12 hours
        archiveTTL: 3 * 24 * 60 * 60 * 1000, // 3 days
        maxMemorySessions: 500,
        maxDiskSessions: 5000,
        cleanupInterval: 30 * 60 * 1000, // 30 minutes
        adaptiveCleanup: false,
        security: {
          sessionIdLength: 16,
          useSecureRandom: false,
          hashSessionIds: false,
          maxContextSize: 512 * 1024, // 512KB
          validateContext: false
        }
      };

      expect(customConfig.memoryTTL).toBe(60 * 60 * 1000);
      expect(customConfig.maxMemorySessions).toBe(500);
      expect(customConfig.adaptiveCleanup).toBe(false);
      expect(customConfig.security.sessionIdLength).toBe(16);
      expect(customConfig.security.useSecureRandom).toBe(false);
    });
  });

  describe('Session Cleanup Policy', () => {
    it('should have valid default cleanup policy', () => {
      expect(DEFAULT_CLEANUP_POLICY.memoryTTL).toBe(2 * 60 * 60 * 1000); // 2 hours
      expect(DEFAULT_CLEANUP_POLICY.diskTTL).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(DEFAULT_CLEANUP_POLICY.archiveTTL).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(DEFAULT_CLEANUP_POLICY.importanceMultiplier.low).toBe(0.5);
      expect(DEFAULT_CLEANUP_POLICY.importanceMultiplier.medium).toBe(1.0);
      expect(DEFAULT_CLEANUP_POLICY.importanceMultiplier.high).toBe(2.0);
      expect(DEFAULT_CLEANUP_POLICY.importanceMultiplier.critical).toBe(4.0);
      expect(DEFAULT_CLEANUP_POLICY.clientTypeMultiplier.human).toBe(1.0);
      expect(DEFAULT_CLEANUP_POLICY.clientTypeMultiplier.agent).toBe(1.5);
      expect(DEFAULT_CLEANUP_POLICY.clientTypeMultiplier.scheduled).toBe(2.0);
      expect(DEFAULT_CLEANUP_POLICY.clientTypeMultiplier.test).toBe(0.1);
      expect(DEFAULT_CLEANUP_POLICY.extendForProgress).toBe(true);
    });

    it('should create custom cleanup policy', () => {
      const customPolicy: SessionCleanupPolicy = {
        memoryTTL: 30 * 60 * 1000, // 30 minutes
        diskTTL: 6 * 60 * 60 * 1000, // 6 hours
        archiveTTL: 24 * 60 * 60 * 1000, // 24 hours
        importanceMultiplier: {
          low: 0.25,
          medium: 0.5,
          high: 1.0,
          critical: 2.0
        },
        clientTypeMultiplier: {
          human: 1.0,
          agent: 1.0,
          scheduled: 1.0,
          test: 0.05
        },
        extendForProgress: false
      };

      expect(customPolicy.memoryTTL).toBe(30 * 60 * 1000);
      expect(customPolicy.importanceMultiplier.low).toBe(0.25);
      expect(customPolicy.clientTypeMultiplier.test).toBe(0.05);
      expect(customPolicy.extendForProgress).toBe(false);
    });
  });

  describe('Session Error Handling', () => {
    it('should create session error with all properties', () => {
      const error = new SessionError(
        'Session not found',
        SessionErrorCode.SESSION_NOT_FOUND,
        'session-123',
        { userId: 'user-456', workflowId: 'workflow-789' }
      );

      expect(error.message).toBe('Session not found');
      expect(error.code).toBe(SessionErrorCode.SESSION_NOT_FOUND);
      expect(error.sessionId).toBe('session-123');
      expect(error.details).toEqual({ userId: 'user-456', workflowId: 'workflow-789' });
      expect(error.name).toBe('SessionError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof SessionError).toBe(true);
    });

    it('should create session error with minimal properties', () => {
      const error = new SessionError(
        'Invalid session ID',
        SessionErrorCode.INVALID_SESSION_ID
      );

      expect(error.message).toBe('Invalid session ID');
      expect(error.code).toBe(SessionErrorCode.INVALID_SESSION_ID);
      expect(error.sessionId).toBeUndefined();
      expect(error.details).toBeUndefined();
      expect(error.name).toBe('SessionError');
    });

    it('should have all required error codes', () => {
      const errorCodes = Object.values(SessionErrorCode);
      
      expect(errorCodes).toContain('SESSION_NOT_FOUND');
      expect(errorCodes).toContain('SESSION_EXPIRED');
      expect(errorCodes).toContain('INVALID_SESSION_ID');
      expect(errorCodes).toContain('SESSION_ALREADY_EXISTS');
      expect(errorCodes).toContain('INVALID_UPDATE');
      expect(errorCodes).toContain('STORAGE_ERROR');
      expect(errorCodes).toContain('VALIDATION_ERROR');
      expect(errorCodes).toContain('RESOURCE_EXHAUSTED');
      expect(errorCodes).toContain('SECURITY_ERROR');
    });
  });

  describe('Default Session Hints', () => {
    it('should have valid default hints', () => {
      expect(DEFAULT_SESSION_HINTS.importance).toBe('medium');
      expect(DEFAULT_SESSION_HINTS.pauseExpected).toBe(false);
      expect(DEFAULT_SESSION_HINTS.clientType).toBe('human');
      expect(DEFAULT_SESSION_HINTS.expectedDuration).toBeUndefined();
      expect(DEFAULT_SESSION_HINTS.description).toBeUndefined();
    });
  });
}); 