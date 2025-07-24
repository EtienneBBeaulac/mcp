# Performance Test Suite

This directory contains a comprehensive performance testing infrastructure for the Workflow Orchestration System's JSON-RPC API endpoints.

## 📊 Overview

The performance test suite validates that all 4 core endpoints meet the required performance targets:

| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|------------|------------|------------|
| `workflow_list` | 50ms | 100ms | 200ms |
| `workflow_get` | 30ms | 80ms | 150ms |
| `workflow_next` | 100ms | 200ms | 400ms |
| `workflow_validate` | 50ms | 120ms | 250ms |

## 🏗️ Architecture

```
tests/performance/
├── setup.ts                    # Performance test configuration
├── utils/
│   ├── benchmark.ts            # Core benchmarking utilities
│   ├── statistics.ts           # Statistical analysis functions
│   └── performance-reporter.js # Custom Jest reporter
├── endpoints/
│   ├── workflow-list.test.ts   # workflow_list performance tests
│   ├── workflow-get.test.ts    # workflow_get performance tests
│   ├── workflow-next.test.ts   # workflow_next performance tests
│   └── workflow-validate.test.ts # workflow_validate performance tests
├── test-runner.ts              # Standalone test runner (bypasses Jest)
└── README.md                   # This documentation
```

## 🚀 Running Performance Tests

### Method 1: Using Jest (Recommended)
```bash
# Run all performance tests
npm run test:performance

# Run specific endpoint tests
npm run test:performance -- --testPathPattern=workflow-list

# Run with verbose output
npm run test:performance -- --verbose
```

### Method 2: Using Standalone Runner
```bash
# Direct execution (bypasses Jest type issues)
npx ts-node tests/performance/test-runner.ts

# Or from project root
npm run build && node -r ts-node/register tests/performance/test-runner.ts
```

## 📈 Performance Measurement

### Benchmarking Process

1. **Warmup Phase**: Runs 10 requests to eliminate cold start bias
2. **Measurement Phase**: Executes 100 iterations with high-resolution timing
3. **Statistical Analysis**: Calculates p50, p95, p99 percentiles plus variance
4. **Validation**: Compares results against defined targets

### Key Features

- **High-Resolution Timing**: Uses `performance.now()` for microsecond precision
- **Statistical Accuracy**: Proper percentile calculations with linear interpolation
- **Variance Detection**: Identifies unstable performance patterns
- **Concurrent Testing**: Validates performance under concurrent load
- **Error Handling**: Measures performance of error scenarios

## 🔧 Configuration

### Performance Targets

Defined in `setup.ts`:

```typescript
export const PERFORMANCE_TARGETS = {
  workflow_list: { p50: 50, p95: 100, p99: 200 },
  workflow_get: { p50: 30, p95: 80, p99: 150 },
  workflow_next: { p50: 100, p95: 200, p99: 400 },
  workflow_validate: { p50: 50, p95: 120, p99: 250 }
};
```

### Test Configuration

```typescript
export const PERFORMANCE_CONFIG = {
  WARMUP_ITERATIONS: 10,      // Warmup requests
  MEASUREMENT_ITERATIONS: 100, // Measurement requests
  TIMEOUT_MS: 5000,           // Request timeout
  MAX_ACCEPTABLE_VARIANCE: 0.3 // 30% coefficient of variation
};
```

## 📊 Test Coverage

### Endpoint-Specific Tests

#### workflow_list
- ✅ Basic performance validation
- ✅ Concurrent request handling
- ✅ Repeated request consistency

#### workflow_get
- ✅ Basic performance validation
- ✅ Multiple workflow ID handling
- ✅ Cache performance verification
- ✅ Error case efficiency

#### workflow_next
- ✅ Basic performance validation
- ✅ Workflow progression states
- ✅ Large completed steps arrays
- ✅ Context data handling
- ✅ Concurrent progression requests

#### workflow_validate
- ✅ Basic performance validation
- ✅ Variable output sizes
- ✅ Different step types
- ✅ Concurrent validation
- ✅ Malformed request handling

## 🎯 Success Criteria

### Performance Targets
- All endpoints must meet p95 targets
- p99 targets provide acceptable upper bounds
- Performance must be stable (variance < 30%)

### Test Quality
- Minimum 80% successful measurements
- Proper statistical significance
- Consistent results across runs

## 📋 Interpreting Results

### Sample Output
```
📊 Performance Report for workflow_list
========================================
Count: 100, Mean: 45.32ms, Min: 12.45ms, Max: 89.12ms
p50: 42.18ms, p95: 78.45ms, p99: 85.32ms, StdDev: 15.67ms

🎯 Target Comparison:
  p50: 42.18ms vs 50ms ✅
  p95: 78.45ms vs 100ms ✅
  p99: 85.32ms vs 200ms ✅
📈 Performance Stability: ✅ Stable
```

### Status Indicators
- ✅ **PASSED**: Meets performance target
- ❌ **FAILED**: Exceeds performance target
- ⚠️ **UNSTABLE**: High variance detected

## 🛠️ Troubleshooting

### Common Issues

#### High Response Times
- Check system load during testing
- Verify database/cache performance
- Review code profiling results

#### Unstable Performance
- Reduce concurrent processes
- Check for memory leaks
- Validate test environment consistency

#### Test Failures
- Verify server is running correctly
- Check workflow data availability
- Review error logs for issues

### Debug Mode
Add detailed logging by setting environment variables:
```bash
DEBUG=performance npm run test:performance
```

## 🔄 Continuous Integration

### GitHub Actions Integration
Add to `.github/workflows/ci.yml`:
```yaml
- name: Run Performance Tests
  run: npm run test:performance
  env:
    NODE_ENV: performance
```

### Performance Regression Detection
The test suite automatically detects:
- Response time increases > 10%
- Stability degradation
- Target threshold violations

## 📝 Best Practices

### Test Development
1. **Isolate Tests**: Each test should be independent
2. **Realistic Data**: Use production-like test data
3. **Environment Control**: Minimize external factors
4. **Adequate Samples**: Use sufficient iterations for accuracy

### Performance Optimization
1. **Profile First**: Identify bottlenecks before optimizing
2. **Measure Impact**: Verify optimization effectiveness
3. **Monitor Trends**: Track performance over time
4. **Set Alerts**: Detect regressions early

## 🚨 Alerts and Monitoring

### Performance Thresholds
- **Warning**: p95 > 80% of target
- **Critical**: p95 > target threshold
- **Emergency**: p99 > 2x target threshold

### Recommended Monitoring
- Response time percentiles
- Error rates during performance tests
- System resource utilization
- Performance trend analysis

## 🔗 Related Documentation

- [API Specification](../../spec/mcp-api-v1.0.md)
- [Performance Guide](../../docs/implementation/06-performance-guide.md)
- [Testing Strategy](../../docs/implementation/04-testing-strategy.md)
- [Architecture Guide](../../docs/implementation/02-architecture.md)

---

**Last Updated**: 2024-01-15  
**Version**: 1.0.0  
**Maintained By**: Performance Engineering Team 