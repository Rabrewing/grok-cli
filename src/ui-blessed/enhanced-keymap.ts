import blessed, { Widgets } from 'neo-blessed';
import { EnhancedRenderManager } from './enhanced-render.js';
import { BREWVERSE_THEME } from './theme.js';

export class EnhancedKeymapManager {
  private layout: any;
  private renderManager: EnhancedRenderManager;
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private currentInput = '';
  private onInputCallback?: (input: string) => void;
  private onCommandCallback?: (command: string, args: string[]) => void;

  constructor(layout: any, renderManager: EnhancedRenderManager) {
    this.layout = layout;
    this.renderManager = renderManager;
    this.setupKeybindings();
  }

  private setupKeybindings(): void {
    const input = this.layout.input;
    
    // Input submission
    input.key(['enter'], (ch, key) => {
      if (!key.shift) {
        this.submitInput();
      }
    });

    // Multiline support with Shift+Enter
    input.key(['S-enter'], (ch, key) => {
      // Allow multiline input
    });

    // Command history navigation
    input.key(['up'], (ch, key) => {
      if (this.commandHistory.length > 0) {
        if (this.historyIndex === -1) {
          this.currentInput = input.getValue();
          this.historyIndex = this.commandHistory.length - 1;
        } else if (this.historyIndex > 0) {
          this.historyIndex--;
        }
        
        if (this.historyIndex >= 0) {
          input.setValue(this.commandHistory[this.historyIndex]);
        }
      }
    });

    input.key(['down'], (ch, key) => {
      if (this.historyIndex !== -1) {
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          input.setValue(this.commandHistory[this.historyIndex]);
        } else {
          this.historyIndex = -1;
          input.setValue(this.currentInput);
        }
      }
    });

    // Auto-scroll controls
    input.key(['end', 'home'], (ch, key) => {
      this.renderManager.scrollToBottom();
    });

    input.key(['pageup', 'pagedown'], (ch, key) => {
      if (key.full === 'pageup') {
        this.layout.transcript.scroll(-this.layout.transcript.height / 2);
      } else {
        this.layout.transcript.scroll(this.layout.transcript.height / 2);
      }
    });

    // Work log toggle
    input.key(['C-w'], (ch, key) => {
      this.renderManager.toggleWorkLog();
    });

    // Clear transcript
    input.key(['C-l'], (ch, key) => {
      this.renderManager.clearTranscript();
    });

    // Clear input
    input.key(['C-u'], (ch, key) => {
      input.clearValue();
    });

    // Command system
    input.key(['/'], (ch, key) => {
      const currentValue = input.getValue();
      if (currentValue === '' || currentValue === '/help') {
        input.setValue('/');
        this.showCommandPalette();
      }
    });

    // Tab completion for commands
    input.key(['tab'], (ch, key) => {
      this.handleTabCompletion();
    });

    // Enhanced cursor movement
    input.key(['C-left'], (ch, key) => {
      // Move cursor word left
      this.moveCursorWord('left');
    });

    input.key(['C-right'], (ch, key) => {
      // Move cursor word right
      this.moveCursorWord('right');
    });

    // Exit
    input.key(['C-c', 'escape'], (ch, key) => {
      if (key.full === 'C-c') {
        process.exit(0);
      } else if (key.full === 'escape') {
        input.clearValue();
        this.renderManager.focusInput();
      }
    });

    // Help command
    input.key(['F1'], (ch, key) => {
      this.showHelp();
    });

    // Model selection
    input.key(['F2'], (ch, key) => {
      this.showModelSelection();
    });

    // Apply mode toggle
    input.key(['F3'], (ch, key) => {
      this.toggleApplyMode();
    });
  }

  private submitInput(): void {
    const input = this.layout.input;
    const value = input.getValue().trim();
    
    if (value === '') return;

    // Check for commands
    if (value.startsWith('/')) {
      this.handleCommand(value);
    } else {
      // Regular message
      this.addToHistory(value);
      if (this.onInputCallback) {
        this.onInputCallback(value);
      }
    }

    input.clearValue();
    this.renderManager.focusInput();
  }

  private handleCommand(commandLine: string): void {
    const [command, ...args] = commandLine.slice(1).split(' ');
    const argsString = args.join(' ');

    this.addToHistory(commandLine);

    switch (command.toLowerCase()) {
      case 'help':
      case 'h':
        this.showHelp();
        break;
      
      case 'clear':
        this.renderManager.clearTranscript();
        break;
      
      case 'models':
        this.showModelSelection();
        break;
      
      case 'apply':
        this.handleApplyCommand(argsString);
        break;
      
      case 'snap':
        this.handleSnapCommand();
        break;
      
      case 'ticket':
        this.handleTicketCommand(argsString);
        break;
      
      case 'work':
      case 'w':
        this.renderManager.toggleWorkLog();
        break;
      
      case 'status':
        this.showStatus();
        break;
      
      case 'exit':
      case 'quit':
        process.exit(0);
        break;
      
      default:
        this.renderManager.appendToTranscript('error', `Unknown command: ${command}. Type /help for available commands.`);
        break;
    }
  }

  private showCommandPalette(): void {
    const commands = [
      '/help      - Show available commands',
      '/clear     - Clear transcript',
      '/models    - Show model selection',
      '/apply     - Toggle apply mode',
      '/snap      - Generate repository snapshot',
      '/ticket    - Create structured ticket',
      '/work      - Toggle work log',
      '/status    - Show current status',
      '/exit      - Exit application',
    ];

    this.renderManager.appendToTranscript('assistant', 'Available Commands:\n' + commands.join('\n'));
  }

  private showHelp(): void {
    const helpText = `
🚀 BrewVerse Terminal - Help

Commands:
  /help      - Show this help message
  /clear     - Clear transcript
  /models    - Switch AI models
  /apply     - Toggle apply mode
  /snap      - Generate repository snapshot
  /ticket     - Create structured ticket
  /work      - Toggle work log panel
  /status    - Show current status and settings

Keyboard Shortcuts:
  Ctrl+C     - Exit application
  Ctrl+L     - Clear transcript
  Ctrl+W     - Toggle work log
  Ctrl+U     - Clear input
  Ctrl+←/→   - Move cursor by word
  PageUp/Down - Scroll transcript
  End/Home    - Scroll to bottom
  F1          - Show help
  F2          - Model selection
  F3          - Toggle apply mode

Tips:
  • Commands auto-complete with Tab
  • Use arrow keys for command history
  • Work log shows tool execution details
  • Supports multiline input with Shift+Enter
    `.trim();

    this.renderManager.appendToTranscript('assistant', helpText);
  }

  private showModelSelection(): void {
    const models = [
      'grok-4-latest',
      'grok-4-vision',
      'grok-code-fast-1',
      'grok-2-latest',
    ];

    this.renderManager.appendToTranscript('assistant', 
      'Available Models:\n' + 
      models.map((model, i) => `  ${i + 1}. ${model}`).join('\n')
    );
  }

  private showStatus(): void {
    const status = `
{bold}{#00C7B7-fg}📊 BrewVerse Terminal Status{/bold}

  Mode: ${this.layout.worklog.hidden ? 'Full Screen' : 'Split Screen'}
  Work Log: ${this.layout.worklog.hidden ? 'Hidden' : 'Visible'}
  History: ${this.commandHistory.length} commands
  Theme: BrewVerse Dark
  Renderer: neo-blessed
    `.trim();

    this.renderManager.appendToTranscript('assistant', status);
  }

  private handleApplyCommand(args: string): void {
    // Implementation would integrate with apply system
    this.renderManager.appendToTranscript('work', `Apply command executed with args: ${args}`);
  }

  private handleSnapCommand(): void {
    this.renderManager.appendToTranscript('work', 'Generating repository snapshot...');
    // Integration would call snapshot generation
  }

  private handleTicketCommand(args: string): void {
    this.renderManager.appendToTranscript('work', `Creating ticket for: ${args || 'current task'}`);
    // Integration would call ticket creation
  }

  private toggleApplyMode(): void {
    this.renderManager.appendToTranscript('work', 'Apply mode toggled');
    // Implementation would handle apply mode
  }

  private handleTabCompletion(): void {
    // Basic tab completion for commands
    const input = this.layout.input;
    const value = input.getValue();
    
    if (value.startsWith('/')) {
      const commands = ['help', 'clear', 'models', 'apply', 'snap', 'ticket', 'work', 'status', 'exit'];
      const partial = value.slice(1);
      const matches = commands.filter(cmd => cmd.startsWith(partial));
      
      if (matches.length === 1) {
        input.setValue('/' + matches[0]);
      }
    }
  }

  private moveCursorWord(direction: 'left' | 'right'): void {
    const input = this.layout.input;
    const value = input.getValue();
    const cursorPos = input.getCursorPos();
    
    // Simple word boundary detection
    const wordRegex = /\b\w+\b/g;
    let match;
    const words = [];
    
    while ((match = wordRegex.exec(value)) !== null) {
      words.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    
    if (direction === 'left') {
      for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].end < cursorPos) {
          input.setCursorPos(words[i].start);
          break;
        }
      }
    } else {
      for (let i = 0; i < words.length; i++) {
        if (words[i].start > cursorPos) {
          input.setCursorPos(words[i].end);
          break;
        }
      }
    }
  }

  private addToHistory(command: string): void {
    this.commandHistory.push(command);
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(-100);
    }
    this.historyIndex = -1;
  }

  public setInputCallback(callback: (input: string) => void): void {
    this.onInputCallback = callback;
  }

  public setCommandCallback(callback: (command: string, args: string[]) => void): void {
    this.onCommandCallback = callback;
  }
}