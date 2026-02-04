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
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private commandPaletteShown = false;

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

    // Add wheel scroll events
    this.layout.timelineBox.on('wheelup', () => {
      this.layout.timelineBox.scroll(-3);
      this.layout.screen.render();
    });
    this.layout.timelineBox.on('wheeldown', () => {
      this.layout.timelineBox.scroll(3);
      this.layout.screen.render();
    });

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
      },
      () => this.historyUp(),
      () => this.historyDown()
    );
  }

  private setupInput(): void {
    // Scroll controls on input (since it's focused)
    this.layout.inputBox.key(['pageup'], () => {
      this.layout.timelineBox.scroll(-this.layout.timelineBox.height);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['pagedown'], () => {
      this.layout.timelineBox.scroll(this.layout.timelineBox.height);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['home'], () => {
      this.layout.timelineBox.setScrollPerc(0);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['end'], () => {
      this.layout.timelineBox.setScrollPerc(100);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['C-u'], () => {
      this.layout.timelineBox.scroll(-this.layout.timelineBox.height / 2);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['C-d'], () => {
      this.layout.timelineBox.scroll(this.layout.timelineBox.height / 2);
      this.layout.screen.render();
    });

    // Additional scroll keys
    this.layout.inputBox.key(['up'], () => {
      this.layout.timelineBox.scroll(-1);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['down'], () => {
      this.layout.timelineBox.scroll(1);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['j'], () => {
      this.layout.timelineBox.scroll(1);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['k'], () => {
      this.layout.timelineBox.scroll(-1);
      this.layout.screen.render();
    });

    this.layout.inputBox.key(['g'], () => {
      if (this.layout.inputBox.getValue() === '') {
        this.layout.timelineBox.setScrollPerc(0);
        this.layout.screen.render();
      }
    });

    this.layout.inputBox.key(['G'], () => {
      this.layout.timelineBox.setScrollPerc(100);
      this.layout.screen.render();
    });

    this.layout.inputBox.on('submit', async (text: string) => {
      if (this.isSubmitting) return; // Prevent double submit

      if (text.trim() === '/') {
        this.showCommandPalette();
        this.renderManager.clearInput();
        this.renderManager.focusInput();
        return;
      }

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
          if (text.trim().startsWith('/')) {
            this.addToHistory(text.trim());
            this.handleCommand(text.trim());
            this.uiState = 'idle';
          } else {
            this.addToHistory(text.trim());
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
    this.renderManager.isFirstAssistantInResponse = true;
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
    this.renderManager.appendAssistant(text);
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

  private handleCommand(commandLine: string): void {
    const [command, ...args] = commandLine.slice(1).split(' ');
    const argsString = args.join(' ');

    switch (command.toLowerCase()) {
      case 'help':
      case 'h':
        this.showHelp();
        break;

      case 'clear':
        this.adapter.clearAll();
        break;

      case 'models':
        this.showModels();
        break;

      case 'work':
      case 'w':
        this.showWorkLog();
        break;

      case 'status':
        this.showStatus();
        break;

      case 'model':
        this.switchModel(argsString);
        break;

      default:
        this.renderManager.appendInfo(`Unknown command: /${command}. Type /help for available commands.`);
        break;
    }
  }

  private showCommandPalette(): void {
    const palette = `
╔══════════════════════════════════════════════════════════════╗
║                     Available Commands                      ║
╠══════════════════════════════════════════════════════════════╣
║ /help, /h     - Show detailed help                          ║
║ /clear        - Clear the conversation                      ║
║ /models       - Show available models                       ║
║ /model <name> - Switch model                                ║
║ /work, /w     - Show work log summary                       ║
║ /status       - Show current status                         ║
╠══════════════════════════════════════════════════════════════╣
║                   Keyboard Shortcuts                        ║
╠══════════════════════════════════════════════════════════════╣
║ Ctrl+C        - Exit                                        ║
║ Ctrl+L        - Clear conversation                          ║
║ PageUp/Down   - Scroll                                      ║
║ Home/End      - Scroll to top/bottom                        ║
║ Up/Down       - Command history                             ║
╚══════════════════════════════════════════════════════════════╝

Type a command and press Enter, or just press Enter to close this menu.
    `;
    this.renderManager.appendInfo(palette);
    this.commandPaletteShown = true;
  }

  private showHelp(): void {
    const helpText = `
Available commands:
/help, /h     - Show this help
/clear        - Clear the conversation
/models       - Show available models
/model <name> - Switch model
/work, /w     - Show work log summary
/status       - Show current status

Keyboard shortcuts:
Ctrl+C        - Exit
Ctrl+L        - Clear conversation
PageUp/Down   - Scroll
Home/End      - Scroll to top/bottom
Up/Down       - Command history
    `;
    this.renderManager.appendInfo(helpText);
  }

  private showModels(): void {
    const models = [
      'grok-code-fast-1 (current)',
      'grok-1',
      'grok-beta'
    ];
    this.renderManager.appendInfo(`Available models:\n${models.join('\n')}\n\nUse /model <name> to switch`);
  }

  private showWorkLog(): void {
    this.renderManager.appendInfo('Work log feature not fully implemented in blessed UI. Use enhanced UI for full work log.');
  }

  private showStatus(): void {
    this.renderManager.appendInfo(`Status: Connected\nModel: grok-code-fast-1\nUI: Blessed Unified Stream\nState: ${this.uiState}`);
  }

  private switchModel(modelName: string): void {
    if (!modelName) {
      this.renderManager.appendInfo('Usage: /model <model-name>\nAvailable models: grok-code-fast-1, grok-1, grok-beta');
      return;
    }
    // TODO: Implement model switching via adapter
    this.renderManager.appendInfo(`Model switching not yet implemented. Requested: ${modelName}`);
  }

  private addToHistory(command: string): void {
    if (this.commandHistory.length === 0 || this.commandHistory[this.commandHistory.length - 1] !== command) {
      this.commandHistory.push(command);
      if (this.commandHistory.length > 100) {
        this.commandHistory.shift();
      }
    }
    this.historyIndex = -1; // Reset for next navigation
  }

  private historyUp(): string | null {
    if (this.commandHistory.length === 0) return null;
    if (this.historyIndex === -1) {
      this.historyIndex = this.commandHistory.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    return this.commandHistory[this.historyIndex] || null;
  }

  private historyDown(): string | null {
    if (this.historyIndex === -1) return null;
    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      return this.commandHistory[this.historyIndex];
    } else {
      this.historyIndex = -1;
      return '';
    }
  }

  shutdown(): void {
    this.layout.screen.destroy();
  }
}