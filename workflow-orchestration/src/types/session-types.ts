// =============================================================================
// SESSION MANAGEMENT TYPES
// =============================================================================

import { ConditionContext } from '../utils/condition-evaluator';

// =============================================================================
// CORE SESSION TYPES
// =============================================================================

/**
 * Represents a unique session for workflow execution.
 * Sessions maintain state across multiple tool calls, enabling stateful workflows.
 */
export interface SessionState {
  /** Cryptographically secure session identifier */
  sessionId: string;
  
  /** ID of the workflow being executed */
  workflowId: string;
  
  /** Array of completed step IDs in execution order */
  completedSteps: string[];
  
  /** Context variables for workflow step conditions and state */
  context: ConditionContext;
  
  /** Timestamp when session was created */
  createdAt: Date;
  
  /** Timestamp of last activity (tool call) */
  lastActivity: Date;
  
  /** Current storage tier for tiered cleanup */
  tier: SessionTier;
  
  /** Total number of tool calls made in this session */
  accessCount: number;
  
  /** Total milliseconds spent in inactive state */
  hibernationTime: number;
  
  /** Client-provided hints for session lifecycle management */
  hints: SessionHints;
  
  /** Session metadata for monitoring and analytics */
  metadata: SessionMetadata;
}

/**
 * Storage tiers for session lifecycle management.
 * Sessions migrate through tiers based on activity patterns.
 */
export type SessionTier = 'memory' | 'disk' | 'archive';

/**
 * Client-provided hints for session management.
 * Helps optimize cleanup policies and resource allocation.
 */
export interface SessionHints {
  /** Expected session duration in milliseconds */
  expectedDuration?: number;
  
  /** Session importance level affects cleanup priority */
  importance: SessionImportance;
  
  /** Whether client expects to pause/resume this session */
  pauseExpected?: boolean;
  
  /** Type of client for different cleanup strategies */
  clientType: SessionClientType;
  
  /** Human-readable description of session purpose */
  description?: string;
}

export type SessionImportance = 'low' | 'medium' | 'high' | 'critical';
export type SessionClientType = 'human' | 'agent' | 'scheduled' | 'test';

/**
 * Session metadata for monitoring and analytics.
 */
export interface SessionMetadata {
  /** Current workflow progress (0-100) */
  progress: number;
  
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  
  /** Recent activity frequency (calls per hour) */
  activityFrequency: number;
  
  /** Session size in bytes for memory management */
  memoryFootprint: number;
  
  /** Number of validation errors encountered */
  validationErrors: number;
  
  /** Custom labels for session categorization */
  labels: Record<string, string>;
}

// =============================================================================
// SESSION LIFECYCLE TYPES
// =============================================================================

/**
 * Result of session creation.
 */
export interface SessionStartResult {
  /** Created session ID */
  sessionId: string;
  
  /** First step of the workflow */
  step: {
    id: string;
    title: string;
    prompt: string;
    agentRole?: string;
    guidance?: string[];
  } | null;
  
  /** Workflow guidance for first step */
  guidance: {
    prompt: string;
  };
  
  /** Whether workflow is complete (empty workflow) */
  isComplete: boolean;
  
  /** Session configuration used */
  config: SessionConfig;
}

/**
 * Session activity tracking for cleanup decisions.
 */
export interface SessionActivity {
  /** Most recent activity timestamp */
  recentActivity: Date;
  
  /** Activity frequency in calls per hour */
  activityFrequency: number;
  
  /** Workflow completion percentage */
  workflowProgress: number;
  
  /** Client type for different cleanup strategies */
  clientType: SessionClientType;
  
  /** Session importance level */
  importance: SessionImportance;
  
  /** Whether session is expected to be paused */
  pauseExpected: boolean;
}

// =============================================================================
// SESSION VALIDATION TYPES
// =============================================================================

/**
 * Result of session validation operations.
 */
export interface SessionValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Array of validation issues */
  issues: string[];
  
  /** Array of suggestions for fixing issues */
  suggestions: string[];
  
  /** Validation warnings that don't prevent operation */
  warnings: string[];
}

/**
 * Parameters for session update operations.
 */
export interface SessionUpdateParams {
  /** New completed steps to add */
  completedSteps?: string[];
  
  /** Context updates to apply */
  context?: Partial<ConditionContext>;
  
  /** Update session hints */
  hints?: Partial<SessionHints>;
  
  /** Update session metadata */
  metadata?: Partial<SessionMetadata>;
}

// =============================================================================
// SESSION CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for session management system.
 */
export interface SessionConfig {
  /** Memory tier cleanup policy */
  memoryTTL: number;
  
  /** Disk tier cleanup policy */
  diskTTL: number;
  
  /** Archive tier cleanup policy */
  archiveTTL: number;
  
  /** Maximum sessions allowed in memory */
  maxMemorySessions: number;
  
  /** Maximum sessions allowed on disk */
  maxDiskSessions: number;
  
  /** Cleanup task interval in milliseconds */
  cleanupInterval: number;
  
  /** Whether to enable adaptive cleanup policies */
  adaptiveCleanup: boolean;
  
  /** Security settings for session ID generation */
  security: SessionSecurityConfig;
}

/**
 * Security configuration for session management.
 */
export interface SessionSecurityConfig {
  /** Length of session ID in bytes */
  sessionIdLength: number;
  
  /** Whether to use cryptographically secure random generation */
  useSecureRandom: boolean;
  
  /** Whether to hash session IDs in logs */
  hashSessionIds: boolean;
  
  /** Maximum session context size in bytes */
  maxContextSize: number;
  
  /** Whether to validate session context values */
  validateContext: boolean;
}

/**
 * Cleanup policy for different session types.
 */
export interface SessionCleanupPolicy {
  /** Base TTL for memory tier */
  memoryTTL: number;
  
  /** Base TTL for disk tier */
  diskTTL: number;
  
  /** Base TTL for archive tier */
  archiveTTL: number;
  
  /** Multiplier for high importance sessions */
  importanceMultiplier: Record<SessionImportance, number>;
  
  /** Multiplier for different client types */
  clientTypeMultiplier: Record<SessionClientType, number>;
  
  /** Whether to extend TTL for near-complete workflows */
  extendForProgress: boolean;
}

// =============================================================================
// SESSION STORAGE INTERFACE
// =============================================================================

/**
 * Interface for session storage backends.
 * Supports tiered storage with memory, disk, and archive layers.
 */
export interface ISessionStorage {
  /**
   * Create a new session with the given state.
   */
  createSession(sessionState: SessionState): Promise<void>;
  
  /**
   * Retrieve a session by ID, checking all tiers.
   */
  getSession(sessionId: string): Promise<SessionState | null>;
  
  /**
   * Update an existing session with partial state.
   */
  updateSession(sessionId: string, updates: SessionUpdateParams): Promise<void>;
  
  /**
   * Delete a session from all tiers.
   */
  deleteSession(sessionId: string): Promise<void>;
  
  /**
   * List all sessions in a specific tier.
   */
  listSessions(tier?: SessionTier): Promise<SessionState[]>;
  
  /**
   * Move a session to a different tier.
   */
  migrateSession(sessionId: string, targetTier: SessionTier): Promise<void>;
  
  /**
   * Clean up expired sessions based on policy.
   */
  cleanupExpiredSessions(policy: SessionCleanupPolicy): Promise<SessionCleanupResult>;
  
  /**
   * Get storage statistics for monitoring.
   */
  getStorageStats(): Promise<SessionStorageStats>;
}

/**
 * Result of session cleanup operations.
 */
export interface SessionCleanupResult {
  /** Number of sessions cleaned up */
  sessionsRemoved: number;
  
  /** Number of sessions migrated to disk */
  sessionsMigratedToDisk: number;
  
  /** Number of sessions migrated to archive */
  sessionsMigratedToArchive: number;
  
  /** Memory freed in bytes */
  memoryFreed: number;
  
  /** Cleanup duration in milliseconds */
  duration: number;
  
  /** Any errors encountered during cleanup */
  errors: string[];
}

/**
 * Storage statistics for monitoring.
 */
export interface SessionStorageStats {
  /** Sessions in each tier */
  sessionsByTier: Record<SessionTier, number>;
  
  /** Total memory usage in bytes */
  memoryUsage: number;
  
  /** Total disk usage in bytes */
  diskUsage: number;
  
  /** Average session size in bytes */
  averageSessionSize: number;
  
  /** Sessions by importance level */
  sessionsByImportance: Record<SessionImportance, number>;
  
  /** Sessions by client type */
  sessionsByClientType: Record<SessionClientType, number>;
  
  /** Last cleanup timestamp */
  lastCleanup: Date;
}

// =============================================================================
// SESSION SERVICE INTERFACE
// =============================================================================

/**
 * Interface for session management service.
 * Provides high-level operations for session lifecycle management.
 */
export interface SessionService {
  /**
   * Create a new session for the given workflow.
   */
  createSession(workflowId: string, hints?: SessionHints): Promise<SessionStartResult>;
  
  /**
   * Retrieve a session by ID.
   */
  getSession(sessionId: string): Promise<SessionState | null>;
  
  /**
   * Update session state after a workflow step.
   */
  updateSession(sessionId: string, updates: SessionUpdateParams): Promise<void>;
  
  /**
   * Validate session update parameters.
   */
  validateSessionUpdate(sessionId: string, updates: SessionUpdateParams): Promise<SessionValidationResult>;
  
  /**
   * Delete a session.
   */
  deleteSession(sessionId: string): Promise<void>;
  
  /**
   * List active sessions with optional filtering.
   */
  listSessions(filter?: SessionFilter): Promise<SessionState[]>;
  
  /**
   * Calculate TTL for a session based on activity.
   */
  calculateSessionTTL(activity: SessionActivity): number;
  
  /**
   * Perform cleanup of expired sessions.
   */
  cleanupSessions(): Promise<SessionCleanupResult>;
  
  /**
   * Get session service statistics.
   */
  getStats(): Promise<SessionStorageStats>;
}

/**
 * Filter options for listing sessions.
 */
export interface SessionFilter {
  /** Filter by workflow ID */
  workflowId?: string;
  
  /** Filter by client type */
  clientType?: SessionClientType;
  
  /** Filter by importance level */
  importance?: SessionImportance;
  
  /** Filter by storage tier */
  tier?: SessionTier;
  
  /** Filter by minimum last activity */
  minLastActivity?: Date;
  
  /** Filter by maximum last activity */
  maxLastActivity?: Date;
}

// =============================================================================
// SESSION ERROR TYPES
// =============================================================================

/**
 * Session-related error types.
 */
export class SessionError extends Error {
  constructor(
    message: string,
    public readonly code: SessionErrorCode,
    public readonly sessionId?: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

export enum SessionErrorCode {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  SESSION_ALREADY_EXISTS = 'SESSION_ALREADY_EXISTS',
  INVALID_UPDATE = 'INVALID_UPDATE',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  SECURITY_ERROR = 'SECURITY_ERROR'
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default session configuration.
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  memoryTTL: 2 * 60 * 60 * 1000, // 2 hours
  diskTTL: 24 * 60 * 60 * 1000, // 24 hours
  archiveTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxMemorySessions: 1000,
  maxDiskSessions: 10000,
  cleanupInterval: 15 * 60 * 1000, // 15 minutes
  adaptiveCleanup: true,
  security: {
    sessionIdLength: 32,
    useSecureRandom: true,
    hashSessionIds: true,
    maxContextSize: 1024 * 1024, // 1MB
    validateContext: true
  }
};

/**
 * Default cleanup policy.
 */
export const DEFAULT_CLEANUP_POLICY: SessionCleanupPolicy = {
  memoryTTL: 2 * 60 * 60 * 1000, // 2 hours
  diskTTL: 24 * 60 * 60 * 1000, // 24 hours
  archiveTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  importanceMultiplier: {
    low: 0.5,
    medium: 1.0,
    high: 2.0,
    critical: 4.0
  },
  clientTypeMultiplier: {
    human: 1.0,
    agent: 1.5,
    scheduled: 2.0,
    test: 0.1
  },
  extendForProgress: true
};

/**
 * Default session hints.
 */
export const DEFAULT_SESSION_HINTS: SessionHints = {
  importance: 'medium',
  pauseExpected: false,
  clientType: 'human'
}; 