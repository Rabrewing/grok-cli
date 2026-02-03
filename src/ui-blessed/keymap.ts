import blessed from 'neo-blessed';
import { LayoutElements } from './layout.js';

export function setupKeybindings(
  layout: LayoutElements,
  onClear: () => void,
  onShutdown: () => void
) {
  const { screen, stream } = layout;

  screen.key(['C-c'], () => {
    onShutdown();
    process.exit(0);
  });

  screen.key(['C-l'], () => {
    onClear();
  });

  screen.key(['pageup'], () => {
    stream.scroll(-stream.height);
    screen.render();
  });

  screen.key(['pagedown'], () => {
    stream.scroll(stream.height);
    screen.render();
  });

  screen.key(['end'], () => {
    stream.setScrollPerc(100);
    screen.render();
  });
}