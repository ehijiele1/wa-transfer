const puppeteer = require('puppeteer');
try {
  console.log('Chrome at:', puppeteer.executablePath());
} catch (e) {
  console.log('No Chrome found:', e.message);
  console.log('Node version:', process.version);
}
