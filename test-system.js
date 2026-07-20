#!/usr/bin/env node

/**
 * Test runner for wa-transfer application
 * This script verifies that all components can be initialized properly
 */

const WhatsAppMonitoringApp = require('./dist/index').default;
const SupabaseService = require('./dist/services/supabase').default;
const config = require('./dist/config').default;

async function runTests() {
  console.log('🧪 Starting wa-transfer system tests...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Configuration Check
  try {
    console.log('📋 Test 1: Configuration Check');
    if (!config.supabase.url) {
      throw new Error('Supabase URL is required');
    }
    if (!config.supabase.anonKey) {
      throw new Error('Supabase anon key is required');
    }
    results.passed++;
    results.tests.push('✅ Configuration loaded successfully');
    console.log('   ✅ Configuration loaded successfully\n');
  } catch (error) {
    results.failed++;
    results.tests.push(`❌ Configuration failed: ${error.message}`);
    console.log(`   ❌ Configuration failed: ${error.message}\n`);
  }

  // Test 2: Supabase Connection
  try {
    console.log('🗄️ Test 2: Supabase Connection');
    const supabase = new SupabaseService();
    const { data, error } = await supabase.supabase.from('messages').select('count', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    results.passed++;
    results.tests.push('✅ Supabase connection successful');
    console.log('   ✅ Supabase connection successful\n');
  } catch (error) {
    results.failed++;
    results.tests.push(`❌ Supabase connection failed: ${error.message}`);
    console.log(`   ❌ Supabase connection failed: ${error.message}\n`);
  }

  // Test 3: App Initialization
  try {
    console.log('🚀 Test 3: App Initialization');
    const app = new WhatsAppMonitoringApp();
    results.passed++;
    results.tests.push('✅ App initialization successful');
    console.log('   ✅ App initialization successful\n');
  } catch (error) {
    results.failed++;
    results.tests.push(`❌ App initialization failed: ${error.message}`);
    console.log(`   ❌ App initialization failed: ${error.message}\n`);
  }

  // Test 4: CLI Commands
  try {
    console.log('🖥️ Test 4: CLI Commands');
    
    // Test help command
    const { execSync } = require('child_process');
    const helpOutput = execSync('node dist/social-media-cli.js help', { encoding: 'utf8' });
    if (!helpOutput.includes('Available commands')) {
      throw new Error('Help command not working');
    }
    
    results.passed++;
    results.tests.push('✅ CLI commands working');
    console.log('   ✅ CLI commands working\n');
  } catch (error) {
    results.failed++;
    results.tests.push(`❌ CLI commands failed: ${error.message}`);
    console.log(`   ❌ CLI commands failed: ${error.message}\n`);
  }

  // Print Results
  console.log('📊 Test Results Summary:');
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Total: ${results.passed + results.failed}\n`);

  console.log('📋 Detailed Results:');
  results.tests.forEach(test => {
    console.log(`   ${test}`);
  });

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The wa-transfer system is ready to use.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});

// Export for testing
module.exports = { runTests, WhatsAppMonitoringApp, SupabaseService };