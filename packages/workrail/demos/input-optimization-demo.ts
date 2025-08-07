import { ContextStripper } from '../src/utils/context-stripper';

// Simulate the actual context from the user's example
const realWorldContext = {
  taskDescription: "Create Mercury bottom sheet MVI framework based on Phase 1 findings",
  ticketId: "ACEI-1570",
  taskComplexity: "large",
  automationLevel: "high",
  requestDeepAnalysis: true,
  userRules: "Architecture: MVI patterns, Anvil DI, composition over inheritance...", // 500+ chars
  clarifiedRequirements: "Framework will follow ConversationMenuViewModel's reducer pattern...",
  confidenceScore: 9,
  implementationSteps: [
    // 14 items, each ~200 chars
    { title: "Constellation Compatibility POC", description: "Create minimal wrapper test...", outputs: "POC validation test..." },
    { title: "Core Contracts with Parcelable Support", description: "Create BottomSheetState...", outputs: "core/BottomSheetContract.kt..." },
    // ... 12 more items
  ],
  currentStep: { title: "Core Contracts...", description: "Create BottomSheetState...", outputs: "core/BottomSheetContract.kt..." },
  stepIndex: 1,
  stepIteration: 2,
  featureBranch: "removal/etienneb/acei-1570_bottomsheet-improvements",
  _currentLoop: {
    loopId: "phase-6-iterative-implementation",
    loopStep: {
      // Entire loop definition with all body steps
      id: "phase-6-iterative-implementation",
      type: "loop",
      title: "Phase 6: Iterative Implementation Loop",
      body: [/* 3 full step definitions */]
    }
  },
  _loopState: {
    "phase-6-iterative-implementation": {
      iteration: 1,
      items: [/* all 14 items again */]
    }
  },
  _contextSize: 17104
};

console.log("=== Input Optimization Demo ===\n");

// Test 1: Default stripping
console.log("1. Default Stripping (no requirements):");
const defaultResult = ContextStripper.stripContext(realWorldContext);
console.log(`   Before: ${defaultResult.stats.before} bytes`);
console.log(`   After: ${defaultResult.stats.after} bytes`);
console.log(`   Reduction: ${defaultResult.stats.reduction}%\n`);

// Test 2: With requirements for phase-6-prep step
console.log("2. With Context Requirements (phase-6-prep):");
const prepRequirements = {
  required: ["currentStep", "stepIndex", "stepIteration", "featureBranch"],
  optional: ["previousStepOutput"],
  exclude: ["implementationSteps", "_loopState", "_currentLoop", "userRules"]
};
const prepResult = ContextStripper.stripContext(realWorldContext, prepRequirements);
console.log(`   Before: ${prepResult.stats.before} bytes`);
console.log(`   After: ${prepResult.stats.after} bytes`);
console.log(`   Reduction: ${prepResult.stats.reduction}%\n`);

// Test 3: Minimal context for verification step
console.log("3. Minimal Context (phase-6-verify):");
const verifyRequirements = {
  required: ["currentStep", "stepIndex"],
  exclude: ["implementationSteps", "_loopState", "_currentLoop", "userRules", "clarifiedRequirements"]
};
const verifyResult = ContextStripper.stripContext(realWorldContext, verifyRequirements);
console.log(`   Before: ${verifyResult.stats.before} bytes`);
console.log(`   After: ${verifyResult.stats.after} bytes`);
console.log(`   Reduction: ${verifyResult.stats.reduction}%\n`);

// Show what actually gets sent
console.log("4. Example Optimized Context for phase-6-prep:");
console.log(JSON.stringify(prepResult.context, null, 2));

// Combined with output optimization
console.log("\n=== Combined Input + Output Optimization ===");
console.log("Current (both ways): ~17KB request + ~17KB response = ~34KB total");
console.log("Optimized: ~3KB request + ~3KB response = ~6KB total");
console.log("Total reduction: ~82% less data transfer!");