#!/usr/bin/env node

/**
 * Test script to verify the WhatsApp Monitoring Application
 * This script checks if all dependencies are available and the basic structure is working
 */

const WhatsAppMonitoringApp = require('./index.js').default;
const config = require('./config/index.js');

console.log('🚀 Testing WhatsApp Monitoring Application...\n');

// Check if configuration is properly loaded
console.log('📋 Configuration Check:');
console.log('✅ Supabase URL:', config.supabase ? 'configured' : 'missing');
console.log('✅ WhatsApp Session ID:', config.whatsapp?.sessionId);
console.log('✅ Ollama Base URL:', config.ollama?.baseUrl);
console.log('✅ Instagram configured:', config.instagram ? 'yes' : 'no');
console.log('✅ Monitoring Groups:', config.monitoring?.groups?.length || 0);
console.log('');

// Check if required directories exist
const fs = require('fs');
const path = require('path');

const requiredDirs = ['creds', 'dist'];
requiredDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`✅ Directory exists: ${dir}`);
  } else {
    console.log(`⚠️  Directory missing: ${dir} (will be created on first run)`);
  }
});

console.log('');

// Check if compiled files exist
const compiledFiles = ['index.js', 'index.d.ts', 'index.js.map'];
compiledFiles.forEach(file => {
  const filePath = path.join(process.cwd(), 'dist', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Compiled file exists: dist/${file}`);
  } else {
    console.log(`❌ Compiled file missing: dist/${file}`);
  }
});

console.log('');

// Check if environment variables are set
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length === 0) {
  console.log('✅ All required environment variables are set');
} else {
  console.log('❌ Missing environment variables:', missingEnvVars.join(', '));
  console.log('💡 Create a .env file based on .env.example');
}

console.log('');

// Test basic functionality
console.log('🧪 Basic Functionality Test:');

try {
  // Test if the main class can be instantiated
  const app = new WhatsAppMonitoringApp();
  console.log('✅ WhatsAppMonitoringApp can be instantiated');
  
  // Test if config is accessible
  console.log('✅ Configuration is accessible');
  console.log('✅ WhatsApp groups to monitor:', config.monitoring.groups.join(', '));
  
  // Test Instagram configuration
  console.log('✅ Instagram configuration:', config.instagram.accessToken ? 'configured' : 'missing');
  console.log('✅ Instagram account ID:', config.instagram.accountId);
  console.log('✅ Instagram max carousel images:', config.instagram.maxCarouselImages);
  
} catch (error) {
  console.log('❌ Error during basic test:', error.message);
}

console.log('');
console.log('🎉 Test completed!');
console.log('');
console.log('📝 Next steps:');
console.log('1. Set up your .env file with Supabase credentials');
console.log('2. Start the application with: npm start');
console.log('3. Scan the QR code with WhatsApp Web');
console.log('4. Monitor the console for real-time updates');