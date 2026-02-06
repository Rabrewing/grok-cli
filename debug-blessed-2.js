#!/usr/bin/env node

import blessed from 'neo-blessed';

console.log('🔍 Blessed TUI Debug - Try 2');

// Force terminal size detection
process.stdout.write('\x1b[18t'); // Report terminal size
process.stdin.setRawMode(true);

let sizeResponse = '';
process.stdin.on('data', (data) => {
  sizeResponse += data.toString();
  if (sizeResponse.includes('t')) {
    process.stdin.setRawMode(false);
    
    const match = sizeResponse.match(/\x1b\[8;(\d+);(\d+)t/);
    if (match) {
      console.log(`Terminal size: ${match[1]} cols x ${match[2]} rows`);
    }
    
    tryScreen();
  }
});

process.stdin.resume();

function tryScreen() {
  try {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'BrewGrok CLI - Debug',
      cursor: { artificial: true, shape: 'line' },
      // Force terminal size
      width: parseInt(process.env.COLUMNS || '80'),
      height: parseInt(process.env.LINES || '24'),
      dump: process.env.GROK_DEBUG ? process.stderr : null,
    });
    
    console.log('✅ Screen created');
    console.log('Screen size:', screen.width, 'x', screen.height);
    
    const box = blessed.box({
      parent: screen,
      top: 1,
      left: 1,
      width: Math.min(screen.width - 2, 78),
      height: Math.min(screen.height - 2, 22),
      content: '🚀 BrewGrok CLI\n\n✅ Blessed TUI Working!\n\nTerminal: ' + process.env.TERM + '\nSize: ' + screen.width + 'x' + screen.height + '\n\nPress ESC, q, or Ctrl+C to exit',
      style: {
        fg: 'white',
        bg: 'blue',
      },
      border: { type: 'line' },
    });
    
    screen.append(box);
    
    screen.key(['escape', 'q', 'C-c'], () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
    
    screen.render();
    console.log('\n🎯 Screen rendered! If you see this, it worked!');
    
  } catch (error) {
    console.error('❌ Screen creation failed:', error.message);
    console.log('💡 Trying alternative...');
    
    // Fallback: Just print the UI to console
    console.log('\n🖥️ CONSOLE MODE FALLBACK:');
    console.log('┌─────────────────────────────────┐');
    console.log('│  🚀 BrewGrok CLI           │');
    console.log('│  ✅ Working (Console Mode) │');
    console.log('│  📱 TERM:', process.env.TERM, '     │');
    console.log('│  📏 Size:', process.env.COLUMNS + 'x' + process.env.LINES, ' │');
    console.log('└─────────────────────────────────┘');
    console.log('\n💡 Use: grok --ui ink for GUI mode');
    process.exit(1);
  }
}