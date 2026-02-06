import blessed from 'neo-blessed';
import clipboardy from 'clipboardy';
import { LayoutElements } from './layout.js';

export function setupKeybindings(
  layout: LayoutElements,
  onClear: () => void,
  onShutdown: () => void,
  onConfirmKey?: (key: string) => void,
  onHistoryUp?: () => string | null,
  onHistoryDown?: () => string | null
) {
  const { screen, timelineBox } = layout;

  screen.key(['C-c'], () => {
    // Only exit if not in input box
    if (screen.focused !== layout.inputBox) {
      onShutdown();
      process.exit(0);
    }
  });

  screen.key(['C-l'], () => {
    onClear();
  });

  // Copy timeline content to clipboard
  screen.key(['C-y'], async () => {
    try {
      // Get all content from timeline box
      const content = timelineBox.getContent ? timelineBox.getContent() : 'No content available';
      await clipboardy.write(content);
    } catch (error) {
      // Ignore copy errors
    }
  });

  // Copy last assistant message (Alt+C)
  screen.key(['M-c'], async () => {
    try {
      // This would need to be implemented to get the last message
      // For now, just copy visible content
      const content = timelineBox.getContent ? timelineBox.getContent() : 'No content available';
      await clipboardy.write(content);
    } catch (error) {
      // Ignore copy errors
    }
  });

  screen.key(['C-v'], async () => {
    try {
      const text = await clipboardy.read();

      // Check for excessively large pastes that could crash the TUI
      const MAX_PASTE_SIZE = 100000; // 100KB limit
      if (text.length > MAX_PASTE_SIZE) {
        layout.inputBox.setValue(`[PASTE TOO LARGE: ${text.length} chars - use smaller chunks]`);
        screen.render();
        return;
      }

      // Handle multi-line paste with special formatting
      if (text.includes('\n')) {
        const lines = text.split('\n');
        const lineCount = lines.length;

        // For very large multi-line pastes, show summary only
        if (lineCount > 1000 || text.length > 50000) {
          layout.inputBox.setValue(`{${lineCount} lines, ${text.length} chars}\n[PASTE CONTENT HIDDEN - TOO LARGE FOR INPUT BOX]\n[Use Ctrl+Shift+V to paste directly or break into smaller chunks]`);
        } else {
          // Format with line count for compact display
          const formattedText = `{${lineCount} lines}\n${text}`;
          layout.inputBox.setValue(formattedText);
        }
      } else {
        // Single line paste - normal insertion
        layout.inputBox.insert(text);
      }

      screen.render();
    } catch (error) {
      // Show paste error in input box
      layout.inputBox.setValue('[PASTE ERROR - try again or use terminal paste]');
      screen.render();
    }
  });

  screen.key(['pageup'], () => {
    timelineBox.scroll(-timelineBox.height);
    screen.render();
  });

  screen.key(['pagedown'], () => {
    timelineBox.scroll(timelineBox.height);
    screen.render();
  });

  screen.key(['C-u'], () => {
    timelineBox.scroll(-timelineBox.height / 2);
    screen.render();
  });

  screen.key(['C-d'], () => {
    timelineBox.scroll(timelineBox.height / 2);
    screen.render();
  });

  screen.key(['home'], () => {
    timelineBox.setScrollPerc(0);
    screen.render();
  });

  screen.key(['end'], () => {
    timelineBox.setScrollPerc(100);
    screen.render();
  });

  // History navigation
  if (onHistoryUp) {
    screen.key(['up'], () => {
      const value = onHistoryUp();
      if (value !== null) {
        layout.inputBox.setValue(value);
        screen.render();
      }
    });
  }

  if (onHistoryDown) {
    screen.key(['down'], () => {
      const value = onHistoryDown();
      if (value !== null) {
        layout.inputBox.setValue(value);
        screen.render();
      }
    });
  }

  // Confirm keys
  if (onConfirmKey) {
    screen.key(['y'], () => onConfirmKey('y'));
    screen.key(['n'], () => onConfirmKey('n'));
    screen.key(['a'], () => onConfirmKey('a'));
    screen.key(['escape'], () => onConfirmKey('escape'));
  }
}