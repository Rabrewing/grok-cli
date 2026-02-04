import { UIAdapter } from '../ui/adapter.js';
import { createLayout, LayoutElements } from './layout.js';
import { setupKeybindings } from './keymap.js';
import { RenderManager } from './render.js';
import { setUiActive } from '../utils/runtime-logger.js';

export type UIState = 'idle' | 'user_committed' | 'thinking' | 'confirming' | 'executing' | 'responding';

export interface BlessedUIOptions {
  adapter?: UIAdapter;
  initialMessage?: string;
}

export class BlessedUI {
  private layout: LayoutElements;
  private renderManager: RenderManager;
  private adapter!: UIAdapter;
  private confirmCallback: ((response: string) => void) | null = null;
  private hasPrintedWelcome = false;
  private isSubmitting = false;
  private uiState: UIState = 'idle';
  private isFirstAssistantInResponse = false;

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
      () => this.adapter.shutdown(),
      (key: string) => {
        if (this.confirmCallback) {
          const response = key === 'y' ? 'yes' : key === 'n' ? 'no' : key === 'a' ? 'all' : 'cancel';
          this.confirmCallback(response);
          this.renderManager.appendInfo(`Decision: ${response.toUpperCase()}`);
          this.confirmCallback = null;
          this.renderManager.hideConfirm();
        }
      }
    );
  }

  private setupInput(): void {
    this.layout.inputBox.on('submit', async (text: string) => {
      if (this.isSubmitting) return; // Prevent double submit

      if (this.confirmCallback) {
        // Handle confirmation response
        const response = text.trim().toLowerCase();
        if (response === 'y' || response === 'yes') {
          this.confirmCallback('yes');
          this.renderManager.appendInfo('Decision: YES');
        } else if (response === 'n' || response === 'no') {
          this.confirmCallback('no');
          this.renderManager.appendInfo('Decision: NO');
        } else if (response === 'a' || response === 'all') {
          this.confirmCallback('all');
          this.renderManager.appendInfo('Decision: ALL');
        } else {
          this.confirmCallback('cancel');
          this.renderManager.appendInfo('Decision: CANCEL');
        }
        this.confirmCallback = null;
        this.renderManager.hideConfirm();
        this.uiState = 'idle';
      } else {
        if (text.trim()) {
          if (text.trim() === '/clear') {
            this.adapter.clearAll();
            this.uiState = 'idle';
          } else {
            // Clear input immediately on submit
            this.renderManager.clearInput();
            this.uiState = 'user_committed';
            this.isSubmitting = true;
            this.renderManager.appendUser(text);
            try {
              await this.adapter.processUserMessage(text);
            } finally {
              this.isSubmitting = false;
              this.uiState = 'idle';
            }
          }
        }
      }
      this.renderManager.focusInput();
    });
  }

  // Methods called by adapter
  startAssistantMessage(id: string): void {
    this.isFirstAssistantInResponse = true;
  }

  appendAssistantChunk(id: string, chunk: string): void {
    // Not used, since we buffer in adapter
  }

  endAssistantMessage(id: string): void {
    // Not used
  }

  clearAll(): void {
    // Clear timeline
    this.layout.timelineBox.setContent('');
    this.layout.screen.render();
  }

  setStatus(text: string): void {
    this.renderManager.setStatus(text);
  }

  requestConfirmation(prompt: string, options: string[], callback: (response: string) => void): void {
    this.uiState = 'confirming';
    this.confirmCallback = callback;
    this.renderManager.showConfirm(prompt);
    // Focus input for response
    this.renderManager.focusInput();
  }

  // Event appenders
  appendAssistant(text: string): void {
    this.uiState = 'responding';
    if (this.isFirstAssistantInResponse) {
      this.renderManager.appendBrewGrok(text);
      this.isFirstAssistantInResponse = false;
    } else {
      this.renderManager.appendAssistant(text);
    }
  }

  appendThinking(text: string): void {
    this.uiState = 'thinking';
    this.renderManager.appendThinking(text);
  }

  clearThinking(): void {
    this.uiState = 'responding';
    this.renderManager.clearThinking();
  }

  appendToolCall(tool: string, command: string, cwd: string): void {
    this.uiState = 'executing';
    this.renderManager.appendToolCall(tool, command, cwd);
  }

  appendToolResult(tool: string, status: string, exitCode: number, stdout: string, stderr: string, duration: number): void {
    this.renderManager.appendToolResult(tool, status, exitCode, stdout, stderr, duration);
  }

  appendDiff(filePath: string, diff: string[]): void {
    this.renderManager.appendDiff(filePath, diff);
  }

  appendCommand(command: string, output: string): void {
    this.renderManager.appendCommand(command, output);
  }

  appendError(title: string, stack?: string): void {
    this.renderManager.appendError(title, stack);
  }

  appendInfo(title: string): void {
    this.renderManager.appendInfo(title);
  }

  shutdown(): void {
    this.layout.screen.destroy();
  }
}