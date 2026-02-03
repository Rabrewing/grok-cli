import blessed from 'neo-blessed';
import { LayoutElements } from './layout.js';

export class RenderManager {
  private layout: LayoutElements;

  constructor(layout: LayoutElements) {
    this.layout = layout;
  }

  appendToStream(text: string) {
    this.layout.stream.pushLine(text);
    this.layout.stream.setScrollPerc(100);
    this.layout.screen.render();
  }

  clearStream() {
    this.layout.stream.setContent('');
    this.layout.screen.render();
  }

  setStatus(text: string) {
    this.layout.screen.title = `BrewGrok CLI - Unified Stream - ${text}`;
    this.layout.screen.render();
  }

  focusInput() {
    this.layout.input.focus();
    this.layout.screen.render();
  }

  clearInput() {
    this.layout.input.clearValue();
    this.layout.screen.render();
  }

  render() {
    this.layout.screen.render();
  }
}