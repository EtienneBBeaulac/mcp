import { RpcClient } from '../../helpers/rpc-client';
import { calculatePercentiles, PerformanceResult } from './statistics';

export interface BenchmarkOptions {
  warmupIterations?: number;
  measurementIterations?: number;
  timeoutMs?: number;
}

export class PerformanceBenchmark {
  private readonly defaultOptions: Required<BenchmarkOptions> = {
    warmupIterations: 10,
    measurementIterations: 100,
    timeoutMs: 5000
  };

  /**
   * Measure performance of an RPC endpoint with statistical analysis
   */
  async measureEndpoint(
    client: RpcClient,
    method: string,
    params: any,
    options: BenchmarkOptions = {}
  ): Promise<PerformanceResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    console.log(`📊 Benchmarking ${method} with ${opts.measurementIterations} iterations`);
    
    // Warmup phase to eliminate cold start bias
    await this.warmupPhase(client, method, params, opts.warmupIterations);
    
    // Measurement phase
    const timings = await this.measurementPhase(client, method, params, opts.measurementIterations, opts.timeoutMs);
    
    // Calculate statistics
    const result = calculatePercentiles(timings);
    
    console.log(`✅ ${method} benchmark completed: p95=${result.p95.toFixed(2)}ms, p99=${result.p99.toFixed(2)}ms`);
    
    return result;
  }

  private async warmupPhase(
    client: RpcClient,
    method: string,
    params: any,
    iterations: number
  ): Promise<void> {
    console.log(`🔥 Warming up ${method} with ${iterations} iterations`);
    
    for (let i = 0; i < iterations; i++) {
      try {
        await client.send(method, params);
      } catch (error) {
        console.warn(`Warmup iteration ${i + 1} failed:`, error);
      }
    }
  }

  private async measurementPhase(
    client: RpcClient,
    method: string,
    params: any,
    iterations: number,
    timeoutMs: number
  ): Promise<number[]> {
    const timings: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = this.getHighResolutionTime();
      
      try {
        await Promise.race([
          client.send(method, params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);
        
        const endTime = this.getHighResolutionTime();
        const duration = endTime - startTime;
        timings.push(duration);
        
        // Progress indicator for long-running tests
        if (i % 25 === 0 && i > 0) {
          console.log(`  Progress: ${i}/${iterations} (${(i/iterations*100).toFixed(1)}%)`);
        }
      } catch (error) {
        console.warn(`Measurement iteration ${i + 1} failed:`, error);
        // Don't include failed measurements in timings
      }
    }

    if (timings.length === 0) {
      throw new Error(`No successful measurements for ${method}`);
    }

    if (timings.length < iterations * 0.8) {
      console.warn(`Warning: Only ${timings.length}/${iterations} measurements succeeded`);
    }

    return timings;
  }

  private getHighResolutionTime(): number {
    // Use performance.now() for high-resolution timing
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    
    // Fallback to Date.now() if performance.now() is not available
    return Date.now();
  }

  /**
   * Validate performance results against targets
   */
  validatePerformance(
    result: PerformanceResult,
    targets: { p50?: number; p95?: number; p99?: number },
    _method: string
  ): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    if (targets.p50 && result.p50 > targets.p50) {
      failures.push(`p50 ${result.p50.toFixed(2)}ms > target ${targets.p50}ms`);
    }

    if (targets.p95 && result.p95 > targets.p95) {
      failures.push(`p95 ${result.p95.toFixed(2)}ms > target ${targets.p95}ms`);
    }

    if (targets.p99 && result.p99 > targets.p99) {
      failures.push(`p99 ${result.p99.toFixed(2)}ms > target ${targets.p99}ms`);
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }
} 