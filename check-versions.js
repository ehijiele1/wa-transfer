const { execSync } = require('child_process');
const result = execSync('npm view @whiskeysockets/baileys versions --json', { cwd: __dirname });
const versions = JSON.parse(result.toString());
const v66 = versions.filter(v => v.startsWith('6.6.'));
const v67 = versions.filter(v => v.startsWith('6.7.'));
console.log('6.6.x versions:', v66.slice(-5));
console.log('6.7.x versions:', v67.slice(-5));
console.log('RC versions:', versions.filter(v => v.includes('rc')).slice(-5));
