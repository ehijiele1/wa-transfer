#!/usr/bin/env node

/**
 * Build validation script for wa-transfer
 * This script verifies that the application builds successfully
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating wa-transfer build...\n');

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Test 1: Check if dist folder exists
try {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    results.passed++;
    results.tests.push('✅ Dist folder exists');
    console.log('   ✅ Dist folder exists');
  } else {
    results.failed++;
    results.tests.push('❌ Dist folder missing');
    console.log('   ❌ Dist folder missing');
  }
} catch (error) {
  results.failed++;
  results.tests.push(`❌ Error checking dist folder: ${error.message}`);
  console.log(`   ❌ Error checking dist folder: ${error.message}`);
}

// Test 2: Check if main compiled file exists
try {
  const mainPath = path.join(__dirname, 'dist', 'index.js');
  if (fs.existsSync(mainPath)) {
    results.passed++;
    results.tests.push('✅ Main compiled file exists');
    console.log('   ✅ Main compiled file exists');
  } else {
    results.failed++;
    results.tests.push('❌ Main compiled file missing');
    console.log('   ❌ Main compiled file missing');
  }
} catch (error) {
  results.failed++;
  results.tests.push(`❌ Error checking main file: ${error.message}`);
  console.log(`   ❌ Error checking main file: ${error.message}`);
}

// Test 3: Check if CLI compiled file exists
try {
  const cliPath = path.join(__dirname, 'dist', 'social-media-cli.js');
  if (fs.existsSync(cliPath)) {
    results.passed++;
    results.tests.push('✅ CLI compiled file exists');
    console.log('   ✅ CLI compiled file exists');
  } else {
    results.failed++;
    results.tests.push('❌ CLI compiled file missing');
    console.log('   ❌ CLI compiled file missing');
  }
} catch (error) {
  results.failed++;
  results.tests.push(`❌ Error checking CLI file: ${error.message}`);
  console.log(`   ❌ Error checking CLI file: ${error.message}`);
}

// Test 4: Check if package.json has correct scripts
try {
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts.build) {
    results.passed++;
    results.tests.push('✅ Build script exists');
    console.log('   ✅ Build script exists');
  } else {
    results.failed++;
    results.tests.push('❌ Build script missing');
    console.log('   ❌ Build script missing');
  }
} catch (error) {
  results.failed++;
  results.tests.push(`❌ Error checking package.json: ${error.message}`);
  console.log(`   ❌ Error checking package.json: ${error.message}`);
}

// Test 5: Check if TypeScript configuration exists
try {
  const tsConfigPath = path.join(__dirname, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    results.passed++;
    results.tests.push('✅ TypeScript config exists');
    console.log('   ✅ TypeScript config exists');
  } else {
    results.failed++;
    results.tests.push('❌ TypeScript config missing');
    console.log('   ❌ TypeScript config missing');
  }
} catch (error) {
  results.failed++;
  results.tests.push(`❌ Error checking TypeScript config: ${error.message}`);
  console.log(`   ❌ Error checking TypeScript config: ${error.message}`);
}

// Test 6: Check if environment template exists
try {
  const envPath = path.join(__dirname, '.env.example');
  if (fs.existsSync(envPath)) {
    results.passed++;
    results.tests.push('✅ Environment template exists');
    console.log('   ✅ Environment template exists');
  } else {
    results.failed++;
    results.tests.push('❌ Environment template missing');
    console.log('   ❌ Environment template missing');
  }
} catch (error) {
  results.failed++;
  results.tests.push(`❌ Error checking environment template: ${error.message}`);
  console.log(`   ❌ Error checking environment template: ${error.message}`);
}

// Test 7: Check if Docker files exist
try {
  const dockerfilePath = path.join(__dirname, 'Dockerfile');
  const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
  
  if (fs.existsSync(dockerfilePath) && fs.existsSync(dockerComposePath)) {
    results.passed++;
    results.tests.push('✅ Docker configuration exists');
    console.log('   ✅ Docker configuration exists');
  } else {
    results.failed++;
    results.tests.push('❌ Docker configuration missing');
    console.log('   ❌ Docker configuration missing');
  }
} catch (error) {
  results.failed++;
  results.tests.push(`❌ Error checking Docker files: ${error.message}`);
  console.log(`   ❌ Error checking Docker files: ${error.message}`);
}

// Print Results
console.log('\n📊 Build Validation Results:');
console.log(`   Passed: ${results.passed}`);
console.log(`   Failed: ${results.failed}`);
console.log(`   Total: ${results.passed + results.failed}\n`);

console.log('📋 Detailed Results:');
results.tests.forEach(test => {
  console.log(`   ${test}`);
});

if (results.failed === 0) {
  console.log('\n🎉 All build validation tests passed! The wa-transfer system is ready to use.');
  console.log('\n🚀 Next steps:');
  console.log('   1. Configure your environment variables (.env file)');
  console.log('   2. Set up Supabase database');
  console.log('   3. Configure social media API tokens (optional)');
  console.log('   4. Run: npm start');
  process.exit(0);
} else {
  console.log('\n⚠️  Some build validation tests failed.');
  console.log('   Please check the issues above and try again.');
  process.exit(1);
}