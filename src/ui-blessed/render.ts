import blessed from 'neo-blessed';
import { LayoutElements } from './layout.js';

export class RenderManager {
  private layout: LayoutElements;
  private worklogVisible = false;

  constructor(layout: LayoutElements) {
    this.layout = layout;
  }

  appendToTranscript(text: string) {
    this.layout.transcript.pushLine(text);
    this.layout.transcript.setScrollPerc(100);
    this.layout.screen.render();
  }

  appendToWorkLog(text: string) {
    this.layout.worklog.pushLine(text);
    this.layout.worklog.setScrollPerc(100);
    this.layout.screen.render();
  }

  clearTranscript() {
    this.layout.transcript.setContent('');
    this.layout.screen.render();
  }

  clearWorkLog() {
    this.layout.worklog.setContent('');
    this.layout.screen.render();
  }

  setStatus(text: string) {
    this.layout.screen.title = `Grok CLI - ${text}`;
    this.layout.screen.render();
  }

  toggleWorkLog() {
    this.worklogVisible = !this.worklogVisible;
    if (this.worklogVisible) {
      this.layout.worklog.show();
      this.layout.transcript.height = '100%-6';
    } else {
      this.layout.worklog.hide();
      this.layout.transcript.height = '100%-3';
    }
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