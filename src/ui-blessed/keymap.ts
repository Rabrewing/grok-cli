import blessed from 'neo-blessed';
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
    onShutdown();
    process.exit(0);
  });

  screen.key(['C-l'], () => {
    onClear();
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