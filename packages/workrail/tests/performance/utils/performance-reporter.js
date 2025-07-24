/**
 * Custom Jest reporter for performance test results
 */
class PerformanceReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.performanceResults = [];
  }

  onTestResult(test, testResult) {
    // Extract performance data from test results
    testResult.testResults.forEach(result => {
      if (result.title.includes('Performance') || result.title.includes('performance')) {
        const performanceData = this.extractPerformanceData(result);
        if (performanceData) {
          this.performanceResults.push(performanceData);
        }
      }
    });
  }

  onRunComplete(contexts, results) {
    if (this.performanceResults.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('📊 PERFORMANCE TEST SUMMARY');
      console.log('='.repeat(60));
      
      this.performanceResults.forEach(result => {
        console.log(`\n🎯 ${result.endpoint}`);
        console.log(`   p50: ${result.p50.toFixed(2)}ms (target: ${result.targets.p50 || 'N/A'}ms)`);
        console.log(`   p95: ${result.p95.toFixed(2)}ms (target: ${result.targets.p95 || 'N/A'}ms)`);
        console.log(`   p99: ${result.p99.toFixed(2)}ms (target: ${result.targets.p99 || 'N/A'}ms)`);
        console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (!result.passed && result.failures.length > 0) {
          console.log(`   Failures: ${result.failures.join(', ')}`);
        }
      });

      // Overall summary
      const passed = this.performanceResults.filter(r => r.passed).length;
      const total = this.performanceResults.length;
      
      console.log(`\n📈 Overall Performance: ${passed}/${total} endpoints passed`);
      
      if (passed === total) {
        console.log('🎉 All performance targets met!');
      } else {
        console.log('⚠️  Some performance targets not met. Review results above.');
      }
      
      console.log('='.repeat(60));
    }
  }

  extractPerformanceData(testResult) {
    // This is a simple extraction - in a real implementation,
    // you might want to parse custom test metadata or use a different approach
    const messages = testResult.failureMessages || [];
    const title = testResult.title || '';
    
    // Try to extract performance data from test title or messages
    // This is a placeholder - actual implementation would depend on how
    // performance data is structured in the tests
    
    return null; // Placeholder
  }
}

module.exports = PerformanceReporter; 