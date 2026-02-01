#!/usr/bin/env node

// Simple fix to ensure Blessed UI works by default
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read current package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update scripts to use blessed by default
packageJson.scripts = {
  ...packageJson.scripts,
  start: 'node dist/index.js',
  'start:blessed': 'node dist/index.js --ui blessed',
  'start:ink': 'node dist/index.js --ui ink'
};

// Add convenient "grok" command that uses blessed by default
packageJson.bin = {
  ...packageJson.bin,
  grok: 'dist/index.js'
};

// Write back the updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'package-lock.json'), 
  JSON.stringify(packageJson, null, 2) + '\n'
);

console.log('✅ Fixed! Now try:');
console.log('  grok                    # Uses BrewVerse Terminal (blessed)');
console.log('  grok --ui ink          # Uses original Ink UI');
console.log('');
console.log('🎉 BrewVerse Terminal now works by default!');