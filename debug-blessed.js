#!/usr/bin/env node

import blessed from 'neo-blessed';
import { BREWVERSE_THEME } from './dist/ui-blessed/theme.js';

console.log('🔍 Starting Blessed TUI debug...');
console.log('TERM:', process.env.TERM);
console.log('Node version:', process.version);
console.log('Blessed version:', blessed.version);

try {
  console.log('🖥 Creating screen...');
  const screen = blessed.screen({
    smartCSR: true,
    title: 'BrewGrok CLI - Debug Test',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
    },
    debug: true,
    log: process.env.GROK_DEBUG ? process.stderr : null,
  });
  
  console.log('✅ Screen created successfully');
  console.log('Screen width:', screen.width);
  console.log('Screen height:', screen.height);
  
  // Create a simple test box
  const box = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '50%',
    height: '50%',
    content: '{center}🚀 BrewGrok TUI Test{/center}',
    style: {
      fg: 'white',
      bg: 'blue',
      bold: true,
    },
    border: {
      type: 'line',
    },
  });
  
  console.log('✅ Box created');
  
  screen.append(box);
  console.log('✅ Box appended to screen');
  
  screen.render();
  console.log('✅ Screen rendered');
  
  // Add a key to exit
  screen.key(['escape', 'q', 'C-c'], (ch, key) => {
    console.log('👋 Exiting...');
    return process.exit(0);
  });
  
  console.log('🎯 TUI should be visible now. Press ESC, q, or Ctrl+C to exit.');
  
} catch (error) {
  console.error('❌ Error initializing Blessed TUI:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}