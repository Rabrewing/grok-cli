import blessed from 'neo-blessed';
import { LayoutElements } from './layout.js';

export function setupKeybindings(
  layout: LayoutElements,
  onClear: () => void,
  onShutdown: () => void,
  toggleWorkLog: () => void
) {
  const { screen, transcript } = layout;

  screen.key(['C-c'], () => {
    onShutdown();
    process.exit(0);
  });

  screen.key(['C-l'], () => {
    onClear();
  });

  screen.key(['C-w'], () => {
    toggleWorkLog();
  });

  screen.key(['pageup'], () => {
    transcript.scroll(-transcript.height);
    screen.render();
  });

  screen.key(['pagedown'], () => {
    transcript.scroll(transcript.height);
    screen.render();
  });

  screen.key(['end'], () => {
    transcript.setScrollPerc(100);
    screen.render();
  });
}