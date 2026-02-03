import { UIAdapter } from '../ui/adapter.js';
import { createLayout, LayoutElements } from './layout.js';
import { setupKeybindings } from './keymap.js';
import { RenderManager } from './render.js';
import { setUiActive } from '../utils/runtime-logger.js';

export interface BlessedUIOptions {
  adapter?: UIAdapter;
  initialMessage?: string;
}

export class BlessedUI {
  private layout: LayoutElements;
  private renderManager: RenderManager;
  private adapter!: UIAdapter;
  private confirmCallback: ((response: string) => void) | null = null;

  getLayout(): LayoutElements {
    return this.layout;
  }

  setAdapter(adapter: UIAdapter) {
    this.adapter = adapter;
  }

  constructor(options: BlessedUIOptions) {
    if (options.adapter) {
      this.adapter = options.adapter;
    }

    this.layout = createLayout();
    setUiActive(true);
    this.renderManager = new RenderManager(this.layout);

    this.setupKeybindings();
    this.setupInput();

    // Focus input and start
    this.renderManager.focusInput();
    this.renderManager.render();
  }

  private setupKeybindings(): void {
    setupKeybindings(
      this.layout,
      () => this.adapter.clearAll(),
      () => this.adapter.shutdown()
    );
  }

  private setupInput(): void {
    this.layout.input.on('submit', async (text: string) => {
      if (this.confirmCallback) {
        // Handle confirmation response
        this.confirmCallback(text.trim().toLowerCase());
        this.confirmCallback = null;
      } else {
        if (text.trim() === '/clear') {
          this.adapter.clearAll();
        } else {
          await this.adapter.processUserMessage(text);
        }
      }
      this.renderManager.clearInput();
      this.renderManager.focusInput();
      this.renderManager.render();
    });
  }

  // Methods called by adapter
  appendToStream(text: string) {
    this.renderManager.appendToStream(text);
  }

  clearStream(): void {
    this.renderManager.clearStream();
  }

  setStatus(text: string): void {
    this.renderManager.setStatus(text);
  }

  requestConfirmation(prompt: string, options: string[], callback: (response: string) => void): void {
    this.confirmCallback = callback;
    this.appendToStream(`❓ CONFIRM ACTION\n${prompt}\n[${options.join('   ')}]`);
    // Focus input for response
    this.renderManager.focusInput();
  }

  shutdown(): void {
    this.layout.screen.destroy();
  }
}