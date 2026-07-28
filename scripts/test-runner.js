#!/usr/bin/env node

/**
 * Comprehensive test runner for wa-transfer
 * Runs unit tests, integration tests, and generates coverage reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  unit: {
    pattern: 'test/**/*.test.ts',
    timeout: 30000,
    coverage: true
  },
  integration: {
    pattern: 'test/integration/**/*.test.ts',
    timeout: 60000,
    coverage: false
  },
  smoke: {
    script: 'node scripts/smoke.ts',
    timeout: 45000
  }
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function runCommand(command, options = {}) {
  const defaultOptions = {
    stdio: 'inherit',
    timeout: options.timeout || 30000,
    ...options
  };

  try {
    execSync(command, defaultOptions);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      signal: error.signal,
      status: error.status 
    };
  }
}

function checkPrerequisites() {
  log('Checking prerequisites...');
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    log('Installing dependencies...', 'info');
    const result = runCommand('npm install');
    if (!result.success) {
      log('Failed to install dependencies', 'error');
      process.exit(1);
    }
    log('Dependencies installed successfully', 'success');
  }

  // Check if dist exists
  if (!fs.existsSync('dist')) {
    log('Building project...', 'info');
    const result = runCommand('npm run build');
    if (!result.success) {
      log('Failed to build project', 'error');
      process.exit(1);
    }
    log('Project built successfully', 'success');
  }
}

function runUnitTests() {
  log('Running unit tests...');
  
  const jestCommand = `jest --testPathPattern="${TEST_CONFIG.unit.pattern}" --testTimeout=${TEST_CONFIG.unit.timeout} ${TEST_CONFIG.unit.coverage ? '--coverage' : ''}`;
  
  const result = runCommand(jestCommand, { timeout: TEST_CONFIG.unit.timeout });
  
  if (result.success) {
    log('Unit tests passed', 'success');
    return true;
  } else {
    log('Unit tests failed', 'error');
    log(`Error: ${result.error}`, 'error');
    return false;
  }
}

function runIntegrationTests() {
  log('Running integration tests...');
  
  const jestCommand = `jest --testPathPattern="${TEST_CONFIG.integration.pattern}" --testTimeout=${TEST_CONFIG.integration.timeout}`;
  
  const result = runCommand(jestCommand, { timeout: TEST_CONFIG.integration.timeout });
  
  if (result.success) {
    log('Integration tests passed', 'success');
    return true;
  } else {
    log('Integration tests failed', 'error');
    log(`Error: ${result.error}`, 'error');
    return false;
  }
}

function runSmokeTests() {
  log('Running smoke tests...');
  
  const result = runCommand(TEST_CONFIG.smoke.script, { 
    timeout: TEST_CONFIG.smoke.timeout 
  });
  
  if (result.success) {
    log('Smoke tests passed', 'success');
    return true;
  } else {
    log('Smoke tests failed', 'error');
    log(`Error: ${result.error}`, 'error');
    return false;
  }
}

function generateCoverageReport() {
  log('Generating coverage report...');
  
  const result = runCommand('jest --coverage');
  
  if (result.success) {
    log('Coverage report generated', 'success');
    
    // Read coverage summary
    const coverageFile = path.join('coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      const total = coverage.total?.pct || 0;
      
      log(`Total coverage: ${total}%`, 'info');
      
      // Check coverage thresholds
      if (total < 80) {
        log('Warning: Coverage below 80%', 'warn');
      } else {
        log('Coverage meets minimum threshold', 'success');
      }
    }
    
    return true;
  } else {
    log('Failed to generate coverage report', 'error');
    return false;
  }
}

function runLinting() {
  log('Running linting...');
  
  const result = runCommand('npm run lint');
  
  if (result.success) {
    log('Linting passed', 'success');
    return true;
  } else {
    log('Linting failed', 'error');
    return false;
  }
}

function runTypeCheck() {
  log('Running type checking...');
  
  const result = runCommand('npm run typecheck');
  
  if (result.success) {
    log('Type checking passed', 'success');
    return true;
  } else {
    log('Type checking failed', 'error');
    return false;
  }
}

function generateTestReport(results) {
  log('Generating test report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: results,
    totalTests: Object.keys(results).filter(key => results[key]).length,
    failedTests: Object.keys(results).filter(key => !results[key]).length,
    passed: Object.values(results).filter(Boolean).length,
    failed: Object.values(results).filter(r => !r).length
  };
  
  // Save report to file
  const reportFile = path.join('reports', 'test-report.json');
  const reportsDir = path.dirname(reportFile);
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Passed: ${report.passed}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(1)}%`);
  
  if (report.failed > 0) {
    console.log('\nFailed Tests:');
    Object.keys(results).forEach(key => {
      if (!results[key]) {
        console.log(`  ❌ ${key}`);
      }
    });
  }
  
  return report;
}

function cleanup() {
  log('Cleaning up...');
  
  // Remove coverage directory if exists
  if (fs.existsSync('coverage')) {
    fs.rmSync('coverage', { recursive: true, force: true });
  }
  
  // Remove temp files
  const tempFiles = ['temp', '.jest'];
  tempFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { recursive: true, force: true });
    }
  });
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const testTypes = args.length > 0 ? args : ['all'];
    
    log('Starting comprehensive test suite...', 'info');
    
    // Check prerequisites
    checkPrerequisites();
    
    // Initialize results
    const results = {};
    
    // Run tests based on arguments
    for (const testType of testTypes) {
      switch (testType) {
        case 'unit':
          results.unit = runUnitTests();
          break;
        case 'integration':
          results.integration = runIntegrationTests();
          break;
        case 'smoke':
          results.smoke = runSmokeTests();
          break;
        case 'coverage':
          results.coverage = generateCoverageReport();
          break;
        case 'lint':
          results.lint = runLinting();
          break;
        case 'typecheck':
          results.typecheck = runTypeCheck();
          break;
        case 'all':
          results.unit = runUnitTests();
          results.integration = runIntegrationTests();
          results.smoke = runSmokeTests();
          results.coverage = generateCoverageReport();
          results.lint = runLinting();
          results.typecheck = runTypeCheck();
          break;
        default:
          log(`Unknown test type: ${testType}`, 'error');
          process.exit(1);
      }
    }
    
    // Generate report
    const report = generateTestReport(results);
    
    // Cleanup
    cleanup();
    
    // Exit with appropriate code
    if (report.failed > 0) {
      log('Some tests failed', 'error');
      process.exit(1);
    } else {
      log('All tests passed!', 'success');
      process.exit(0);
    }
    
  } catch (error) {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at ${promise}: ${reason}`, 'error');
  process.exit(1);
});

// Run the test runner
if (require.main === module) {
  main();
}

module.exports = { main, runUnitTests, runIntegrationTests, runSmokeTests, generateCoverageReport };