#!/usr/bin/env npx ts-node

import path from 'path';
import { RpcClient } from '../helpers/rpc-client';
import { PerformanceBenchmark } from './utils/benchmark';
import { generatePerformanceReport } from './utils/statistics';
import { PERFORMANCE_TARGETS, setupPerformanceEnvironment, cleanupPerformanceEnvironment } from './setup';

/**
 * Simple performance test runner that validates the infrastructure works
 * This bypasses Jest to avoid type issues and directly tests the performance utilities
 */
async function runPerformanceTests() {
  const SERVER_PATH = path.resolve(__dirname, '../../src/index.ts');
  let client: RpcClient | null = null;
  
  try {
    setupPerformanceEnvironment();
    
    console.log('🚀 Starting performance test validation');
    console.log('=' .repeat(60));
    
    // Initialize client and benchmark utilities
    client = new RpcClient(SERVER_PATH);
    const benchmark = new PerformanceBenchmark();
    
    // Test 1: workflow_list performance
    console.log('\n📊 Testing workflow_list endpoint...');
    const listResult = await benchmark.measureEndpoint(
      client,
      'workflow_list',
      {},
      {
        warmupIterations: 5,
        measurementIterations: 20,
        timeoutMs: 5000
      }
    );
    
    const listReport = generatePerformanceReport('workflow_list', listResult, PERFORMANCE_TARGETS.workflow_list);
    console.log(listReport);
    
    const listValidation = benchmark.validatePerformance(listResult, PERFORMANCE_TARGETS.workflow_list, 'workflow_list');
    console.log(`Result: ${listValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test 2: workflow_get performance
    console.log('\n📊 Testing workflow_get endpoint...');
    const getResult = await benchmark.measureEndpoint(
      client,
      'workflow_get',
      { id: 'simple-auth-implementation' },
      {
        warmupIterations: 5,
        measurementIterations: 20,
        timeoutMs: 5000
      }
    );
    
    const getReport = generatePerformanceReport('workflow_get', getResult, PERFORMANCE_TARGETS.workflow_get);
    console.log(getReport);
    
    const getValidation = benchmark.validatePerformance(getResult, PERFORMANCE_TARGETS.workflow_get, 'workflow_get');
    console.log(`Result: ${getValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test 3: workflow_next performance
    console.log('\n📊 Testing workflow_next endpoint...');
    const nextResult = await benchmark.measureEndpoint(
      client,
      'workflow_next',
      { 
        workflowId: 'simple-auth-implementation',
        completedSteps: []
      },
      {
        warmupIterations: 5,
        measurementIterations: 20,
        timeoutMs: 5000
      }
    );
    
    const nextReport = generatePerformanceReport('workflow_next', nextResult, PERFORMANCE_TARGETS.workflow_next);
    console.log(nextReport);
    
    const nextValidation = benchmark.validatePerformance(nextResult, PERFORMANCE_TARGETS.workflow_next, 'workflow_next');
    console.log(`Result: ${nextValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test 4: workflow_validate performance
    console.log('\n📊 Testing workflow_validate endpoint...');
    const validateResult = await benchmark.measureEndpoint(
      client,
      'workflow_validate',
      { 
        workflowId: 'simple-auth-implementation',
        stepId: 'prep',
        output: 'Sample validation output for performance testing'
      },
      {
        warmupIterations: 5,
        measurementIterations: 20,
        timeoutMs: 5000
      }
    );
    
    const validateReport = generatePerformanceReport('workflow_validate', validateResult, PERFORMANCE_TARGETS.workflow_validate);
    console.log(validateReport);
    
    const validateValidation = benchmark.validatePerformance(validateResult, PERFORMANCE_TARGETS.workflow_validate, 'workflow_validate');
    console.log(`Result: ${validateValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📈 PERFORMANCE TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const allTests = [
      { name: 'workflow_list', validation: listValidation },
      { name: 'workflow_get', validation: getValidation },
      { name: 'workflow_next', validation: nextValidation },
      { name: 'workflow_validate', validation: validateValidation }
    ];
    
    const passedTests = allTests.filter(test => test.validation.passed).length;
    const totalTests = allTests.length;
    
    allTests.forEach(test => {
      console.log(`${test.validation.passed ? '✅' : '❌'} ${test.name}`);
      if (!test.validation.passed && test.validation.failures.length > 0) {
        console.log(`   Failures: ${test.validation.failures.join(', ')}`);
      }
    });
    
    console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All performance tests passed! Infrastructure is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️  Some performance tests failed. Check individual results above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Performance test runner failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
    cleanupPerformanceEnvironment();
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 