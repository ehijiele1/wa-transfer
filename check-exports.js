const m = require('@whiskeysockets/baileys');
console.log(Object.keys(m).filter(k => k.includes('makeWASocket') || k.includes('Browsers') || k.includes('fetch')).join(', '));
