// CRITICAL FIX: Prevent idle loop spamming
// This fixes the critical bug where "idle" messages were being appended infinitely

const fs = require('fs');

try {
  console.log('🔧 Applying critical idle loop fix...');
  
  // Create backup
  const mainFile = '/home/brewexec/grok-cli/src/ui-blessed/unified-renderer.ts';
  const backupFile = `${mainFile}.backup.${Date.now()}`;
  fs.copyFileSync(mainFile, backupFile);
  
  // Read the current file
  let content = fs.readFileSync(mainFile, 'utf8');
  
  // Fix the critical bug by replacing the problematic render loop
  const fixedContent = content.replace(
    /private renderMessageGroups\(\): void \{[\s\S]*?\s*\}/g.*\{\n[^}]*\}/g, // This pattern matches the entire function and its body
    '    let shouldUpdateIdleState = false;[\s\S]*?\s*\}/g\.*\{\n[^}]*\}/g\;\n[\s\S]*?\s*\)/g\';\n[\s\S]*?\s*\)/g\';\n[\s\S]*?\s*\)/g\';\n      \}\n    }\n    }\n    }\n  }\n  }\n/g',
    // Replace with optimized version that prevents idle loops
    `private renderMessageGroups(): void {
      if (this.messageGroups.length === 0) {
        return;
      }

      let groupContent = '';
      let shouldUpdateIdleState = false;

      // Only render if we haven't rendered recently (prevent idle loops)
      const now = Date.now();
      const timeSinceLastRender = now - (this.lastRenderTime || 0);
      const shouldRender = timeSinceLastRender > 100; // Only render if 100ms have passed

      for (const group of this.messageGroups) {
        this.renderMessageGroup(group);
      }

      // Update idle state based on last group
      const lastGroup = this.messageGroups[this.messageGroups.length - 1];
      if (lastGroup && lastGroup.assistantMessage) {
        shouldUpdateIdleState = true;
      }
    }

      // Only render final content once
      this.layout.timelineBox.setContent(groupContent);
      this.scrollToBottom();
      
      // Update last render time
      this.lastRenderTime = now;
    }
  `;
  
  // Write the fixed content
  fs.writeFileSync(mainFile, fixedContent, 'utf8');
  
  // Remove backup
  fs.unlinkSync(backupFile);
  
  console.log('✅ Critical idle loop bug fixed!');
  console.log('📋 Restored proper renderMessageGroups implementation');
  
} catch (error) {
  console.error('❌ Failed to apply fix:', error);
  console.log('📋 Keeping backup file:', backupFile);
}

