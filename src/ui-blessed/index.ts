import { UIAdapter } from '../adapter.js';
import { createLayout, LayoutElements } from './layout.js';
import { setupKeybindings } from './keymap.js';
import { RenderManager } from './render.js';

export interface BlessedUIOptions {
  adapter?: UIAdapter;
  initialMessage?: string;
}

export class BlessedUI {
  private layout: LayoutElements;
  private renderManager: RenderManager;
  private adapter!: UIAdapter;

  setAdapter(adapter: UIAdapter) {
    this.adapter = adapter;
  }

  constructor(options: BlessedUIOptions) {
    if (options.adapter) {
      this.adapter = options.adapter;
    }

    this.layout = createLayout();
    this.renderManager = new RenderManager(this.layout);

    this.setupKeybindings();
    this.setupInput();

    // Focus input
    this.renderManager.focusInput();
    this.renderManager.render();
  }

  private setupKeybindings() {
    setupKeybindings(
      this.layout,
      () => this.adapter.clearAll(),
      () => this.adapter.shutdown(),
      () => this.renderManager.toggleWorkLog()
    );
  }

  private setupInput() {
    this.layout.input.on('submit', async (text: string) => {
      if (text.trim() === '/clear') {
        this.adapter.clearAll();
      } else {
        await this.adapter.processUserMessage(text);
      }
      this.renderManager.clearInput();
      this.renderManager.focusInput();
      this.renderManager.render();
    });
  }

  // Methods called by adapter
  appendToTranscript(text: string) {
    this.renderManager.appendToTranscript(text);
  }

  appendToWorkLog(text: string) {
    this.renderManager.appendToWorkLog(text);
  }

  clearTranscript() {
    this.renderManager.clearTranscript();
  }

  clearWorkLog() {
    this.renderManager.clearWorkLog();
  }

  setStatus(text: string) {
    this.renderManager.setStatus(text);
  }

  shutdown() {
    this.layout.screen.destroy();
  }
}