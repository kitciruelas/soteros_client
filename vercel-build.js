#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting Vercel build process...');

try {
  // Ensure we're in the right directory
  process.chdir(__dirname);
  
  // Make sure node_modules/.bin is executable
  console.log('Setting permissions for node_modules/.bin...');
  try {
    execSync('chmod +x node_modules/.bin/*', { stdio: 'ignore' });
  } catch (e) {
    console.log('Permission setting skipped (not needed on this platform)');
  }
  
  // Run the build
  console.log('Running Vite build...');
  execSync('npx vite build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
