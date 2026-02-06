#!/usr/bin/env node

console.log('🔍 BrewGrok TUI Diagnostic Tool');
console.log('================================');

// Check terminal environment
console.log('📱 Terminal Info:');
console.log('  TERM:', process.env.TERM || 'unknown');
console.log('  COLUMNS:', process.env.COLUMNS || 'not set');
console.log('  LINES:', process.env.LINES || 'not set');
console.log('  Node version:', process.version);

// Test Blessed initialization
try {
  const blessed = require('neo-blessed');
  console.log('✅ neo-blessed loaded');
  
  // Test minimal screen creation
  console.log('🖥️  Testing minimal screen...');
  const screen = blessed.screen({
    width: 80,
    height: 24,
    smartCSR: false, // Disable for compatibility
    autoPadding: false,
    dump: false,
    debug: false,
    log: null,
  });
  
  console.log('✅ Screen created:', screen.width, 'x', screen.height);
  
  // Simple test content
  const box = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: 80,
    height: 24,
    content: '🚀 BrewGrok CLI\n\n✅ Blessed TUI is working!\n\nThis is a test screen.\n\nPress ESC to exit.',
    style: {
      fg: 'white',
      bg: 'blue',
      bold: true,
    },
    border: { type: 'line' },
  });
  
  screen.append(box);
  
  screen.key(['escape', 'q', 'C-c'], () => {
    console.log('\n✅ Test successful! Blessed TUI can work.');
    process.exit(0);
  });
  
  screen.render();
  console.log('🎯 Screen rendered. If you can see the blue box, it worked!');
  
  // Auto-exit after 3 seconds for testing
  setTimeout(() => {
    console.log('\n✅ Test completed automatically.');
    process.exit(0);
  }, 3000);
  
} catch (error) {
  console.error('❌ Blessed TUI failed:', error.message);
  
  console.log('\n💡 SOLUTIONS:');
  console.log('1. Use Ink UI instead (works in all terminals):');
  console.log('   grok --ui ink');
  console.log('');
  console.log('2. Set terminal environment variables:');
  console.log('   export COLUMNS=80');
  console.log('   export LINES=24');
  console.log('   grok --ui blessed');
  console.log('');
  console.log('3. Try different terminal:');
  console.log('   - GNOME Terminal');
  console.log('   - iTerm2');
  console.log('   - Terminal.app');
  console.log('   - Windows Terminal');
  console.log('');
  console.log('4. Use headless mode for testing:');
  console.log('   grok --prompt "your message here"');
}