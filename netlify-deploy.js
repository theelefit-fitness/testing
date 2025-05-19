/**
 * Helper script for Netlify deployment
 * 
 * This script helps with common deployment issues:
 * 1. Makes sure CI=false is set to ignore warnings
 * 2. Ensures _redirects file exists
 * 3. Logs useful information before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure the build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build');
}

// Ensure _redirects file exists
const redirectsContent = '/* /index.html 200';
const redirectsPath = path.join('build', '_redirects');
fs.writeFileSync(redirectsPath, redirectsContent);

console.log('📂 Created _redirects file in build folder');

// Copy netlify.toml to build directory (optional)
if (fs.existsSync('netlify.toml')) {
  fs.copyFileSync('netlify.toml', path.join('build', 'netlify.toml'));
  console.log('📂 Copied netlify.toml to build folder');
}

// Log deployment information
console.log('\n🚀 Deployment preparation complete!');
console.log('📝 Remember to set up these environment variables in Netlify:');
console.log('   - REACT_APP_FIREBASE_API_KEY');
console.log('   - REACT_APP_FIREBASE_AUTH_DOMAIN');
console.log('   - REACT_APP_FIREBASE_PROJECT_ID');
console.log('   - REACT_APP_FIREBASE_STORAGE_BUCKET');
console.log('   - REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
console.log('   - REACT_APP_FIREBASE_APP_ID');
console.log('\n💡 Deploy to Netlify with:');
console.log('   1. Connect to your repository in the Netlify dashboard');
console.log('   2. Set build command: CI=false npm run build');
console.log('   3. Set publish directory: build');
console.log('\nOr use Netlify CLI:');
console.log('   npm install -g netlify-cli');
console.log('   netlify deploy\n'); 