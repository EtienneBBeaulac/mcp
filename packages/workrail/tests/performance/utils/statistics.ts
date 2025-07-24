export interface PerformanceResult {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
  stddev: number;
  count: number;
  variance: number;
}

/**
 * Calculate percentiles and statistical measures from timing data
 */
export function calculatePercentiles(timings: number[]): PerformanceResult {
  if (timings.length === 0) {
    throw new Error('Cannot calculate percentiles from empty array');
  }

  // Sort timings for percentile calculation
  const sorted = [...timings].sort((a, b) => a - b);
  const count = sorted.length;

  // Calculate percentiles
  const p50 = getPercentile(sorted, 50);
  const p95 = getPercentile(sorted, 95);
  const p99 = getPercentile(sorted, 99);

  // Calculate basic statistics
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;
  const min = sorted[0]!; // Non-null assertion since we check length > 0
  const max = sorted[count - 1]!; // Non-null assertion since we check length > 0

  // Calculate variance and standard deviation
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const stddev = Math.sqrt(variance);

  return {
    p50,
    p95,
    p99,
    mean,
    min,
    max,
    stddev,
    count,
    variance
  };
}

/**
 * Calculate specific percentile from sorted array
 */
function getPercentile(sortedArray: number[], percentile: number): number {
  if (percentile < 0 || percentile > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }

  const index = (percentile / 100) * (sortedArray.length - 1);
  
  if (Number.isInteger(index)) {
    return sortedArray[index]!; // Non-null assertion since index is within bounds
  }
  
  // Linear interpolation for non-integer indices
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sortedArray[lower]! * (1 - weight) + sortedArray[upper]! * weight;
}

/**
 * Format performance result for display
 */
export function formatPerformanceResult(result: PerformanceResult): string {
  return [
    `Count: ${result.count}`,
    `Mean: ${result.mean.toFixed(2)}ms`,
    `Min: ${result.min.toFixed(2)}ms`,
    `Max: ${result.max.toFixed(2)}ms`,
    `p50: ${result.p50.toFixed(2)}ms`,
    `p95: ${result.p95.toFixed(2)}ms`,
    `p99: ${result.p99.toFixed(2)}ms`,
    `StdDev: ${result.stddev.toFixed(2)}ms`
  ].join(', ');
}

/**
 * Check if performance results are within acceptable variance
 */
export function isPerformanceStable(result: PerformanceResult, maxVariance: number = 0.3): boolean {
  const coefficientOfVariation = result.stddev / result.mean;
  return coefficientOfVariation <= maxVariance;
}

/**
 * Compare two performance results
 */
export function comparePerformanceResults(
  baseline: PerformanceResult,
  current: PerformanceResult
): {
  p50Change: number;
  p95Change: number;
  p99Change: number;
  isRegression: boolean;
} {
  const p50Change = ((current.p50 - baseline.p50) / baseline.p50) * 100;
  const p95Change = ((current.p95 - baseline.p95) / baseline.p95) * 100;
  const p99Change = ((current.p99 - baseline.p99) / baseline.p99) * 100;

  // Consider it a regression if any percentile increased by more than 10%
  const isRegression = p50Change > 10 || p95Change > 10 || p99Change > 10;

  return {
    p50Change,
    p95Change,
    p99Change,
    isRegression
  };
}

/**
 * Generate performance summary report
 */
export function generatePerformanceReport(
  endpoint: string,
  result: PerformanceResult,
  targets: { p50?: number; p95?: number; p99?: number }
): string {
  const lines = [
    `📊 Performance Report for ${endpoint}`,
    '=' .repeat(40),
    formatPerformanceResult(result),
    '',
    '🎯 Target Comparison:'
  ];

  if (targets.p50) {
    const status = result.p50 <= targets.p50 ? '✅' : '❌';
    lines.push(`  p50: ${result.p50.toFixed(2)}ms vs ${targets.p50}ms ${status}`);
  }

  if (targets.p95) {
    const status = result.p95 <= targets.p95 ? '✅' : '❌';
    lines.push(`  p95: ${result.p95.toFixed(2)}ms vs ${targets.p95}ms ${status}`);
  }

  if (targets.p99) {
    const status = result.p99 <= targets.p99 ? '✅' : '❌';
    lines.push(`  p99: ${result.p99.toFixed(2)}ms vs ${targets.p99}ms ${status}`);
  }

  const isStable = isPerformanceStable(result);
  lines.push(`📈 Performance Stability: ${isStable ? '✅ Stable' : '⚠️ Unstable'}`);

  return lines.join('\n');
} 