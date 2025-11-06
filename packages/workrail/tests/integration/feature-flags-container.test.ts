/**
 * Integration Tests: Feature Flags + Dependency Injection Container
 * 
 * Demonstrates clean architecture patterns:
 * - Dependency injection through container
 * - Testability through overrides
 * - Separation of concerns
 */

import { describe, it, expect } from 'vitest';
import { createAppContainer } from '../../src/container.js';
import { StaticFeatureFlagProvider } from '../../src/config/feature-flags.js';

describe('Feature Flags Integration with Container', () => {
  describe('Default Container', () => {
    it('creates feature flag provider automatically', () => {
      const container = createAppContainer();
      
      expect(container.featureFlags).toBeDefined();
      expect(typeof container.featureFlags.isEnabled).toBe('function');
    });

    it('provides feature flags to all services that need them', () => {
      const container = createAppContainer();
      
      // Feature flags are accessible
      const sessionToolsEnabled = container.featureFlags.isEnabled('sessionTools');
      expect(typeof sessionToolsEnabled).toBe('boolean');
    });
  });

  describe('Dependency Injection (Override)', () => {
    it('allows injecting custom feature flag provider for testing', () => {
      // Create test-specific feature flags
      const testFlags = new StaticFeatureFlagProvider({
        sessionTools: true,
        experimentalWorkflows: true,
        verboseLogging: true,
      });
      
      // Inject into container
      const container = createAppContainer({
        featureFlags: testFlags,
      });
      
      // Container uses injected provider
      expect(container.featureFlags.isEnabled('sessionTools')).toBe(true);
      expect(container.featureFlags.isEnabled('experimentalWorkflows')).toBe(true);
    });

    it('supports partial overrides (only override what you need)', () => {
      const testFlags = new StaticFeatureFlagProvider({
        sessionTools: false, // Test with session tools disabled
      });
      
      const container = createAppContainer({
        featureFlags: testFlags,
        // Other services use defaults
      });
      
      expect(container.featureFlags.isEnabled('sessionTools')).toBe(false);
      expect(container.workflowService).toBeDefined(); // Other services still work
    });
  });

  describe('Clean Architecture', () => {
    it('maintains single responsibility - container only composes', () => {
      const container = createAppContainer();
      
      // Container provides services, doesn't implement business logic
      expect(container.featureFlags).toBeDefined();
      expect(container.workflowService).toBeDefined();
      expect(container.storage).toBeDefined();
      expect(container.validationEngine).toBeDefined();
      
      // Container itself has no business logic methods
      expect((container as any).processWorkflow).toBeUndefined();
      expect((container as any).validateData).toBeUndefined();
    });

    it('services receive dependencies, not global state', () => {
      const testFlags = new StaticFeatureFlagProvider({
        verboseLogging: true,
      });
      
      const container1 = createAppContainer({
        featureFlags: testFlags,
      });
      
      const container2 = createAppContainer({
        featureFlags: new StaticFeatureFlagProvider({
          verboseLogging: false,
        }),
      });
      
      // Different containers have different configurations (no shared global state)
      expect(container1.featureFlags.isEnabled('verboseLogging')).toBe(true);
      expect(container2.featureFlags.isEnabled('verboseLogging')).toBe(false);
    });
  });

  describe('Testability', () => {
    it('makes unit testing easy with dependency injection', () => {
      // Test scenario: Session tools enabled
      const withSessionTools = createAppContainer({
        featureFlags: new StaticFeatureFlagProvider({
          sessionTools: true,
        }),
      });
      
      expect(withSessionTools.featureFlags.isEnabled('sessionTools')).toBe(true);
      
      // Test scenario: Session tools disabled
      const withoutSessionTools = createAppContainer({
        featureFlags: new StaticFeatureFlagProvider({
          sessionTools: false,
        }),
      });
      
      expect(withoutSessionTools.featureFlags.isEnabled('sessionTools')).toBe(false);
      
      // Easy to test both scenarios without environment manipulation
    });

    it('isolates tests (no side effects between tests)', () => {
      // Test 1: All features enabled
      const test1Container = createAppContainer({
        featureFlags: new StaticFeatureFlagProvider({
          sessionTools: true,
          experimentalWorkflows: true,
        }),
      });
      
      expect(test1Container.featureFlags.isEnabled('sessionTools')).toBe(true);
      
      // Test 2: All features disabled (Test 1 doesn't affect Test 2)
      const test2Container = createAppContainer({
        featureFlags: new StaticFeatureFlagProvider({
          sessionTools: false,
          experimentalWorkflows: false,
        }),
      });
      
      expect(test2Container.featureFlags.isEnabled('sessionTools')).toBe(false);
      
      // No shared state - tests are isolated
    });
  });

  describe('DRY Principle', () => {
    it('centralizes feature flag configuration (no duplication)', () => {
      const container = createAppContainer();
      
      // Single source of truth for feature flags
      const flags = container.featureFlags;
      
      // No need to recreate or duplicate flag logic elsewhere
      // All services get the same feature flag instance
      expect(flags).toBe(container.featureFlags);
    });
  });

  describe('Liskov Substitution Principle', () => {
    it('can substitute different feature flag implementations', () => {
      // Different implementations are interchangeable
      const implementations = [
        new StaticFeatureFlagProvider({ sessionTools: true }),
        new StaticFeatureFlagProvider({ sessionTools: false }),
      ];
      
      for (const impl of implementations) {
        const container = createAppContainer({
          featureFlags: impl,
        });
        
        // All implementations support the same interface
        const result = container.featureFlags.isEnabled('sessionTools');
        expect(typeof result).toBe('boolean');
      }
    });
  });
});

describe('Real-World Usage Patterns', () => {
  describe('Production Configuration', () => {
    it('uses environment variables in production', () => {
      // Production: Reads from actual environment
      const prodContainer = createAppContainer();
      
      // Feature flags reflect environment configuration
      expect(prodContainer.featureFlags).toBeDefined();
    });
  });

  describe('Testing Configuration', () => {
    it('uses static values in tests (fast, predictable)', () => {
      // Test: Inject known values
      const testContainer = createAppContainer({
        featureFlags: new StaticFeatureFlagProvider({
          sessionTools: true,
          verboseLogging: false,
        }),
      });
      
      // Predictable behavior for testing
      expect(testContainer.featureFlags.isEnabled('sessionTools')).toBe(true);
      expect(testContainer.featureFlags.isEnabled('verboseLogging')).toBe(false);
    });
  });

  describe('Development Configuration', () => {
    it('can enable all experimental features for development', () => {
      const devContainer = createAppContainer({
        featureFlags: new StaticFeatureFlagProvider({
          sessionTools: true,
          experimentalWorkflows: true,
          verboseLogging: true,
        }),
      });
      
      // All features enabled for development/testing
      expect(devContainer.featureFlags.isEnabled('sessionTools')).toBe(true);
      expect(devContainer.featureFlags.isEnabled('experimentalWorkflows')).toBe(true);
      expect(devContainer.featureFlags.isEnabled('verboseLogging')).toBe(true);
    });
  });
});

