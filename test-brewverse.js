#!/usr/bin/env node

// Comprehensive BrewVerse Terminal Test
import { spawn } from 'child_process';

console.log('🧪 Testing BrewVerse Terminal...\n');

// Test basic functionality
const testProcess = spawn('node', ['dist/index.js', '--ui', 'blessed', '--prompt', 'test message']);

testProcess.stdout.on('data', (data) => {
  console.log('OUTPUT:', data.toString());
});

testProcess.stderr.on('data', (data) => {
  console.log('ERROR:', data.toString());
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ BrewVerse Terminal test completed successfully!');
  } else {
    console.log(`❌ Test failed with code ${code}`);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  testProcess.kill('SIGTERM');
  console.log('⏰ Test timeout reached');
}, 10000);