import { UIAdapter } from '../ui/adapter.js';
import { createEnhancedLayout, LayoutElements, WorkLogEntry } from './enhanced-layout.js';
import { EnhancedRenderManager } from './enhanced-render.js';
import { EnhancedKeymapManager } from './enhanced-keymap.js';

export interface BlessedUIOptions {
  adapter?: UIAdapter;
  initialMessage?: string;
}

export class BlessedUI {
  private layout: LayoutElements;
  private renderManager: EnhancedRenderManager;
  private keymapManager: EnhancedKeymapManager;
  private adapter!: UIAdapter;

  setAdapter(adapter: UIAdapter) {
    this.adapter = adapter;
  }

  constructor(options: BlessedUIOptions) {
    if (options.adapter) {
      this.adapter = options.adapter;
    }

    this.layout = createEnhancedLayout();
    this.renderManager = new EnhancedRenderManager(this.layout);
    this.keymapManager = new EnhancedKeymapManager(this.layout, this.renderManager);

    this.setupInput();

    // Focus input and show welcome
    this.renderManager.focusInput();
    this.renderManager.render();
    
    // Show splash screen after brief delay
    setTimeout(() => {
      this.showSplashScreen();
    }, 100);
  }

  private showSplashScreen(): void {
    const splashText = `
╔═════════════════════════════════════════════════════════════╗
║                                                              ║
║  🚀 BREWVERSE TERMINAL - GROK CLI v1.0                         ║
║                                                              ║
║  Advanced AI-powered development environment                ║
║  Flicker-free • Feature-rich • Terminal-native           ║
║                                                              ║
║  Ready for your next command...                          ║
║                                                              ║
╚═════════════════════════════════════════════════════════════╝
    `.trim();

    this.renderManager.appendToTranscript('assistant', splashText);
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
    this.renderManager.appendToTranscript('assistant', text);
  }

  appendToWorkLog(text: string) {
    // Convert string to WorkLogEntry for enhanced render manager
    const workEntry: WorkLogEntry = {
      id: `legacy_${Date.now()}`,
      type: 'legacy',
      label: text,
      detail: text,
      timestamp: new Date(),
      status: 'success',
    };
    this.renderManager.appendToWorkLog(workEntry);
  }

  clearTranscript() {
    this.renderManager.clearTranscript();
  }

  clearWorkLog() {
    this.renderManager.clearWorkLog();
  }

  setStatus(text: string) {
    this.renderManager.updateStatus(text);
  }

  // New methods for enhanced features
  getLayout(): LayoutElements {
    return this.layout;
  }

  shutdown() {
    this.layout.screen.destroy();
  }
}