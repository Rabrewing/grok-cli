import { UIAdapter } from '../ui/adapter.js';
import { createLayout, LayoutElements } from './layout.js';
import { setupKeybindings } from './keymap.js';
import { RenderManager } from './render.js';
import { UnifiedTimelineRenderer, emitEvent, preventDirectRendering } from './unified-renderer.js';
import { BREWVERSE_THEME } from './theme.js';
import { setUiActive } from '../utils/runtime-logger.js';
import { ExecutionStateManager } from './mutation-plan.js';
import { taskPlanManager, TaskPriority } from './task-plan-manager.js';

export type UIState = 'idle' | 'user_committed' | 'thinking' | 'confirming' | 'executing' | 'responding';

export interface BlessedUIOptions {
  adapter?: UIAdapter;
  initialMessage?: string;
}

export class BlessedUI {
  private layout: LayoutElements;
  private renderManager: RenderManager;
  private unifiedRenderer: UnifiedTimelineRenderer;
  private adapter!: UIAdapter;
  private confirmCallback: ((response: string) => void) | null = null;
  private hasPrintedWelcome = false;
  private isSubmitting = false;
  private uiState: UIState = 'idle';
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private commandPaletteShown = false;
  private executionStateManager: ExecutionStateManager;

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
    this.unifiedRenderer = UnifiedTimelineRenderer.initialize(this.layout);
    this.executionStateManager = new ExecutionStateManager();

    // Initial render to show the UI
    this.layout.screen.render();

    // Focus the input box so it's ready for user input
    this.renderManager.focusInput();

    // Show welcome message
    this.renderManager.appendInfo('Welcome to BrewGrok CLI! Type your request or use /help for commands.');

    // Add wheel scroll events
    this.layout.timelineBox.on('wheelup', () => {
      this.layout.timelineBox.scroll(-3);
      this.layout.screen.render();
    });

    this.layout.inputBox.on('input', (text: string) => {
      // Count lines for paste preview
      const lines = text.split('\n');
      const lineCount = lines.length;
      
      // Show command palette when user types just "/"
      if (text.trim() === '/' && !this.commandPaletteShown) {
        this.showCommandPalette();
        this.renderManager.clearInput();
        this.renderManager.focusInput();
        return;
      }
      
      // Hide command palette when user continues typing beyond "/"
      if (this.commandPaletteShown && !text.trim().startsWith('/')) {
        this.hideCommandPalette();
      }
      
      // Show paste preview when content is multi-line or large
      if (lineCount > 1 || text.length > 100) {
        const preview = this.generatePastePreview(text);
        this.showPastePreview(preview, lineCount, text.length);
      } else {
        this.hidePastePreview();
      }
      
      // Update display to show current input
      this.layout.screen.render();
    });

    // Handle paste events specifically
    this.layout.inputBox.on('paste', (data: any) => {
      const pastedText = data.text || data;
      if (pastedText) {
        const lines = pastedText.split('\n');
        const lineCount = lines.length;
        const charCount = pastedText.length;
        
        // Show paste preview
        const preview = this.generatePastePreview(pastedText);
        this.showPastePreview(preview, lineCount, charCount);
        
        this.layout.screen.render();
      }
    });

    // Handle Ctrl+V for paste (if terminal supports it)
    this.layout.inputBox.key(['C-v'], () => {
      // Try to get clipboard content (terminal dependent)
      this.renderManager.appendInfo('Paste detected - use terminal paste (Ctrl+Shift+V or right-click)');
    });

    // Handle mouse paste (middle-click)
    this.layout.inputBox.on('mouse', (data: any) => {
      if (data.action === 'mousedown' && data.button === 'middle') {
        this.renderManager.appendInfo('Middle-click paste detected');
      }
    });

    // Handle direct terminal paste events (safely)
    this.layout.inputBox.on('paste', (text: string) => {
      try {
        // Prevent extremely large pastes from crashing
        const MAX_PASTE_SIZE = 100000;
        if (text.length > MAX_PASTE_SIZE) {
          this.layout.inputBox.setValue(`[PASTE TOO LARGE: ${text.length} chars - break into smaller chunks]`);
          this.layout.screen.render();
          return;
        }

        // Handle multi-line terminal pastes
        if (text.includes('\n')) {
          const lines = text.split('\n');
          const lineCount = lines.length;

          // For very large pastes, don't show content in input box
          if (lineCount > 1000 || text.length > 50000) {
            this.layout.inputBox.setValue(`{${lineCount} lines, ${text.length} chars}\n[CONTENT HIDDEN - USE SMALLER CHUNKS OR Ctrl+V]`);
            this.renderManager.appendInfo(`📋 Large paste detected (${lineCount} lines) - content hidden for safety`);
          } else {
            // Safe to show formatted content
            const formattedText = `{${lineCount} lines}\n${text}`;
            this.layout.inputBox.setValue(formattedText);
            this.renderManager.appendInfo(`📋 Pasted ${lineCount} lines - press Enter to send`);
          }
        } else {
          // Single line paste - append normally
          const currentValue = this.layout.inputBox.getValue();
          this.layout.inputBox.setValue(currentValue + text);
        }

        this.layout.screen.render();
      } catch (error) {
        // Handle paste errors gracefully
        this.layout.inputBox.setValue('[PASTE ERROR - try smaller content or Ctrl+V]');
        this.layout.screen.render();
      }
    });

    // Tab key handles plan mode toggle above
    // Confirmation keys will be handled by unified renderer when implemented

    // Handle Tab key for plan mode toggle
    this.layout.inputBox.key(['tab'], () => {
      this.unifiedRenderer.handleTabKey();
      this.renderManager.focusInput();
    });

    // Handle Enter key manually and prevent default submit behavior
    this.layout.inputBox.key(['enter'], async () => {
      const text = this.layout.inputBox.getValue();
      if (this.isSubmitting) return; // Prevent double submit

      // Check for paste preview - if Escape was pressed, restore original
      if (this.layout.inputBox['_originalValue'] !== undefined && text === '') {
        this.layout.inputBox.setValue(this.layout.inputBox['_originalValue']);
        delete this.layout.inputBox['_originalValue'];
        this.renderManager.focusInput();
        return false;
      }

      // Handle formatted multi-line paste (e.g., "{300 lines}\n...")
      if (text.match(/^\{\d+ lines/)) {
        try {
          // Extract the actual content after the line count marker
          const linesMatch = text.match(/^\{(\d+) lines\}/);
          if (linesMatch) {
            const lineCount = parseInt(linesMatch[1]);
            let actualContent = '';

            if (text.includes('[CONTENT HIDDEN]')) {
              // For hidden content, ask user to try smaller chunks
              this.renderManager.appendInfo('❌ Paste too large for input box. Please break into smaller chunks.');
              this.layout.inputBox.setValue('');
              return false;
            } else {
              actualContent = text.replace(/^\{\d+ lines\}\n/, '');
            }

            // Safety check for content size
            if (actualContent.length > 50000) {
              this.renderManager.appendInfo('⚠️ Large paste detected - processing may be slow');
            }

            // Process as single message
            this.addToHistory(actualContent);
            this.uiState = 'user_committed';
            this.isSubmitting = true;
            this.renderManager.appendUser(`[Pasted ${lineCount} lines]`);

            setTimeout(() => {
              this.renderManager.clearInput();
            }, 100);

            try {
              await this.adapter.processUserMessage(actualContent);
            } catch (error) {
              this.renderManager.appendError('Paste processing failed', error.message);
            } finally {
              this.isSubmitting = false;
              this.uiState = 'idle';
            }
            return false;
          }
        } catch (error) {
          this.renderManager.appendError('Paste format error', error.message);
          this.layout.inputBox.setValue('');
          return false;
        }
      }

      if (text.trim() === '/') {
        this.showCommandPalette();
        this.renderManager.clearInput();
        this.renderManager.focusInput();
        return;
      }

      if (this.confirmCallback) {
        // Handle confirmation response
        const response = text.trim().toLowerCase();
        
        // Enter without text = default "yes" 
        if (response === '' || response === 'y' || response === 'yes') {
          this.confirmCallback('yes');
          this.renderManager.appendInfo('✅ Decision: YES');
        } else if (response === 'n' || response === 'no') {
          this.confirmCallback('no');
          this.renderManager.appendInfo('❌ Decision: NO');
        } else if (response === 'a' || response === 'all') {
          this.confirmCallback('all');
          this.renderManager.appendInfo('🚀 Decision: YES TO ALL');
        } else {
          this.confirmCallback('cancel');
          this.renderManager.appendInfo('⏸ Decision: CANCEL');
        }
        this.confirmCallback = null;
        this.renderManager.hideConfirm();
        this.uiState = 'idle';
        this.returnFocusToMainInput();
      } else {
        if (text.trim()) {
          if (text.trim().startsWith('/')) {
            this.addToHistory(text.trim());
            this.handleCommand(text.trim());
            this.uiState = 'idle';
          } else {
            this.addToHistory(text.trim());
            this.uiState = 'user_committed';
            this.isSubmitting = true;
            this.renderManager.appendUser(text);

            // Clear input after message appears in timeline
            setTimeout(() => {
              this.renderManager.clearInput();
            }, 100);

            try {
              await this.adapter.processUserMessage(text);
            } finally {
              this.isSubmitting = false;
              this.uiState = 'idle';
            }
          }
        }
      }
      
      // Clear any stored paste preview state
      delete this.layout.inputBox['_originalValue'];
      this.renderManager.focusInput();
      return false; // Prevent default submit behavior
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
    // Clear timeline through unified renderer
    this.unifiedRenderer.clear();
  }

  setStatus(text: string): void {
    this.renderManager.setStatus(text);
  }

  requestConfirmation(prompt: string, options: string[], callback: (response: string) => void): void {
    this.uiState = 'confirming';
    this.confirmCallback = callback;
    this.renderManager.showConfirm(prompt);
    // Clear input and keep focus for modal key handling
    this.layout.inputBox.setValue('');
    this.renderManager.focusInput();
  }

  /**
   * Return focus to main input after confirmation decision
   */
  private returnFocusToMainInput(): void {
    // Clear any confirmation remnants
    this.layout.inputBox.setValue('');
    // Ensure input is ready for new user input
    this.layout.inputBox.focus();
    // Re-render to show focus state
    this.layout.screen.render();
  }

  /**
   * Get current model from adapter
   */
  private getCurrentModel(): string {
    try {
      return (this.adapter as any).getCurrentModel?.() || 'grok-code-fast-1';
    } catch {
      return 'grok-code-fast-1';
    }
  }

  /**
   * Get current working directory
   */
  private getCurrentDirectory(): string {
    try {
      return process.cwd();
    } catch {
      return '/';
    }
  }

  /**
   * Handle task management commands
   */
  private handleTaskCommand(args: string[]): void {
    if (args.length === 0) {
      this.showTaskHelp();
      return;
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'add':
        this.addTask(args.slice(1));
        break;
      case 'list':
      case 'ls':
        this.listTasks();
        break;
      case 'focus':
        this.focusTask(args.slice(1));
        break;
      case 'complete':
        this.completeTask(args.slice(1));
        break;
      case 'plan':
        this.showTaskPlan();
        break;
      default:
        this.renderManager.appendInfo(`Unknown task command: ${subCommand}. Type /task help for available commands.`);
        break;
    }
  }

  /**
   * Show task command help
   */
  private showTaskHelp(): void {
    const helpText = `
{gold-fg}┌─ Task Management Help ─────────────────────┐
│                                          │
│ {teal-fg}/task add <title> <description>{/gold-fg}  │
│   Add a new task                       │
│                                          │
│ {teal-fg}/task list{/gold-fg} or {teal-fg}/task ls{/gold-fg}     │
│   List all tasks                         │
│                                          │
│ {teal-fg}/task focus <task_id>{/gold-fg}            │
│   Focus on specific task                 │
│                                          │
│ {teal-fg}/task complete <task_id>{/gold-fg}         │
│   Mark task as completed                │
│                                          │
│ {teal-fg}/task plan{/gold-fg}                         │
│   Show current task plan                │
│                                          │
└──────────────────────────────────────────┘{/}`;
    
    this.renderManager.appendInfo(helpText);
  }

  /**
   * Add a new task
   */
  private addTask(args: string[]): void {
    if (args.length < 2) {
      this.renderManager.appendInfo('Usage: /task add <title> <description>');
      return;
    }

    const [title, ...descriptionParts] = args;
    const description = descriptionParts.join(' ');
    
    try {
      const task = taskPlanManager.addTask(title, description, 'MEDIUM');
      this.renderManager.appendInfo(`✅ Task added: ${task.title} [${task.priority}]`);
    } catch (error) {
      this.renderManager.appendInfo(`❌ Failed to add task: ${error}`);
    }
  }

  /**
   * List all tasks
   */
  private listTasks(): void {
    const plan = taskPlanManager.getCurrentPlan();
    
    if (!plan) {
      this.renderManager.appendInfo('ℹ️ No active task plan. Create one with /task add first.');
      return;
    }

    if (plan.tasks.length === 0) {
      this.renderManager.appendInfo('ℹ️ No tasks in current plan.');
      return;
    }

    let taskList = `{gold-fg}┌─ Current Tasks ─────────────────────┐
│                                   │`;

    plan.tasks.forEach((task, index) => {
      const statusIcon = task.status === 'COMPLETED' ? '✅' : 
                        task.status === 'IN_PROGRESS' ? '🔄' : '⏸️';
      const priorityColor = task.priority === 'HIGH' ? '{red-fg}' :
                         task.priority === 'MEDIUM' ? '{gold-fg}' : '{teal-fg}';
      
      taskList += `│ ${index + 1}. ${statusIcon} ${task.id} {${priorityColor}[${task.priority}]{/}`;
      taskList += `\n│     ${task.title}`;
    });

    taskList += `│                                   │
└──────────────────────────────────┘{/}`;

    this.renderManager.appendInfo(taskList);
  }

  /**
   * Focus on a specific task
   */
  private focusTask(args: string[]): void {
    if (args.length === 0) {
      this.renderManager.appendInfo('Usage: /task focus <task_id>');
      return;
    }

    const taskId = args[0];
    const plan = taskPlanManager.getCurrentPlan();
    
    if (!plan) {
      this.renderManager.appendInfo('ℹ️ No active task plan.');
      return;
    }

    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) {
      this.renderManager.appendInfo(`❌ Task not found: ${taskId}`);
      return;
    }

    try {
      taskPlanManager.setFocusTask(task.id);
      this.renderManager.appendInfo(`🎯 Focused on: ${task.title} [${task.priority}]`);
    } catch (error) {
      this.renderManager.appendInfo(`❌ Failed to focus task: ${error}`);
    }
  }

  /**
   * Complete a task
   */
  private completeTask(args: string[]): void {
    if (args.length === 0) {
      this.renderManager.appendInfo('Usage: /task complete <task_id>');
      return;
    }

    const taskId = args[0];
    const plan = taskPlanManager.getCurrentPlan();
    
    if (!plan) {
      this.renderManager.appendInfo('ℹ️ No active task plan.');
      return;
    }

    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) {
      this.renderManager.appendInfo(`❌ Task not found: ${taskId}`);
      return;
    }

    try {
      const result = {
        taskId: task.id,
        success: true,
        duration: 0,
        acceptanceChecklist: task.acceptanceCriteria.map(criteria => ({
          criteria,
          passed: true
        }))
      };
      
      taskPlanManager.completeTask(task.id, result);
      this.renderManager.appendInfo(`✅ Completed: ${task.title}`);
    } catch (error) {
      this.renderManager.appendInfo(`❌ Failed to complete task: ${error}`);
    }
  }

  /**
   * Show current task plan
   */
  private showTaskPlan(): void {
    const plan = taskPlanManager.getCurrentPlan();
    
    if (!plan) {
      this.renderManager.appendInfo('ℹ️ No active task plan.');
      return;
    }

    const completed = plan.tasks.filter(t => t.status === 'COMPLETED').length;
    const total = plan.tasks.length;
    
    const planInfo = `
{gold-fg}┌─ Task Plan ─────────────────────┐
│                                 │
│ {teal-fg}Plan:{/gold-fg} ${plan.title}        │
│ {teal-fg}Progress:{/gold-fg} ${completed}/${total} tasks  │
│ {teal-fg}Status:{/gold-fg} ${plan.status}         │
│                                 │
└──────────────────────────────────┘{/}`;

    this.renderManager.appendInfo(planInfo);
  }

  // Event appenders - Now using unified renderer
  appendAssistant(text: string): void {
    this.uiState = 'responding';
    emitEvent('assistant_message', { content: text });
  }

  appendThinking(text: string): void {
    this.uiState = 'thinking';
    // Use better BrewGrok-specific thinking messages
    const improvedText = text.includes('thinking') ? 'BrewGrok is processing...' : text;
    emitEvent('assistant_stage', { stage: 'thinking', description: improvedText });
  }

  clearThinking(): void {
    this.uiState = 'responding';
    // Clear thinking is handled by next event replacing it
  }

  appendToolCall(tool: string, command: string, cwd: string): void {
    this.uiState = 'executing';
    emitEvent('tool_invocation', {
      toolCall: { function: { name: tool }, command, cwd },
      startTime: new Date(),
      status: 'running'
    });
  }

  appendToolResult(tool: string, status: string, exitCode: number, stdout: string, stderr: string, duration: number): void {
    emitEvent('tool_result', {
      toolCall: { function: { name: tool } },
      success: status === 'success',
      output: stdout,
      error: stderr,
      duration
    });
  }

  appendDiff(filePath: string, diff: string[]): void {
    const diffText = diff.join('\n');
    const addedLines = diff.filter(line => line.startsWith('+')).length;
    const removedLines = diff.filter(line => line.startsWith('-')).length;
    
    emitEvent('diff_preview', {
      filePath,
      changes: { added: addedLines, removed: removedLines },
      diff: diffText
    });
  }

  appendCommand(command: string, output: string): void {
    emitEvent('tool_result', {
      toolCall: { function: { name: 'bash' } },
      success: true,
      output,
      duration: 0
    });
  }

  appendError(title: string, stack?: string): void {
    emitEvent('system_notice', { level: 'error', message: `${title}${stack ? '\n' + stack : ''}` });
  }

  appendInfo(title: string): void {
    emitEvent('system_notice', { level: 'info', message: title });
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
        this.clearAll();
        this.renderManager.appendInfo('Conversation cleared.');
        break;

      case 'auto-approve':
        const currentState = this.executionStateManager.isAutoApproved();
        const newState = !currentState;
        this.executionStateManager.setAutoApprove(newState);
        this.renderManager.appendInfo(`${newState ? '✅ Auto-approve ENABLED' : '❌ Auto-approve DISABLED'}`);
        break;

      case 'task':
        this.handleTaskCommand(args);
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

      case 'timestamps':
        const state = argsString.toLowerCase();
        if (state === 'on' || state === 'off') {
          this.renderManager.appendInfo(`Timestamps ${state} (not yet implemented)`);
        } else {
          this.renderManager.appendInfo('Usage: /timestamps on|off');
        }
        break;

      default:
        this.renderManager.appendInfo(`Unknown command: /${command}. Type /help for available commands.`);
        break;
    }
  }

  private showCommandPalette(): void {
    const palette = `
╔════════════════════════════════════════════════════════╗
║                     Available Commands                      ║
╠══════════════════════════════════════════════════════════╣
║ /help, /h     - Show detailed help                          ║
 ║ /clear        - Clear the conversation                      ║
 ║ /auto-approve - Toggle auto-approve for operations             ║
 ║ /task add <title> <desc> - Add new task                   ║
 ║ /task list - List all tasks                                 ║
 ║ /task focus <id> - Focus on specific task                  ║
 ║ /task complete <id> - Mark task as completed               ║
 ║ /task plan - Show current task plan                         ║
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
╚════════════════════════════════════════════════════════════╝

Type a command and press Enter, or just press Enter to close this menu.
    `;
    this.renderManager.appendInfo(palette);
    this.commandPaletteShown = true;
  }

  /**
   * Hide command palette
   */
  private hideCommandPalette(): void {
    if (this.commandPaletteShown) {
      this.commandPaletteShown = false;
      // Clear the command palette by rendering a clear and then the normal state
      this.renderManager.appendInfo(''); // Clear the palette display
      this.renderManager.clearInput();
      this.renderManager.focusInput();
    }
  }

  private showHelp(): void {
    const helpText = `{gold-fg}
┌─ Available Commands ─────────────────────┐
│                                          │
│ {teal-fg}/help, /h{/gold-fg}        - Show this help        │
│ {teal-fg}/clear{/gold-fg}           - Clear conversation   │
│ {teal-fg}/auto-approve{/gold-fg}    - Toggle auto-approve   │
│ {teal-fg}/task <action>{/gold-fg}     - Task management       │
│ {teal-fg}/models{/gold-fg}         - Show all models       │
│ {teal-fg}/model <name>{/gold-fg}    - Switch model         │
│ {teal-fg}/status{/gold-fg}         - Show system status   │
│ {teal-fg}/work, /w{/gold-fg}        - Show work log         │
│ {teal-fg}/status{/gold-fg}         - Show status          │
│                                          │
│ {#9CA3AF-fg}Confirmation Shortcuts:{/gold-fg}           │
│ {teal-fg}Enter or Y{/gold-fg} = Yes      │
│ {red-fg}N{/gold-fg} = No                  │
│ {gold-fg}A{/gold-fg} = Yes to all            │
│ {#9CA3AF-fg}Esc{/gold-fg} = Cancel              │
│                                          │
└──────────────────────────────────────────┘{/}`;

    this.renderManager.appendInfo(helpText);
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

  private showModels(): void {
    const availableModels = [
      'grok-4o', // Grok 4 Omni
      'grok-4o-fast-reasoning', // Grok 4 Omni Fast Reasoning
      'grok-4o-fast-reasoning-preview', // Grok 4 Omni Fast Reasoning Preview
      'grok-4o-mini', // Grok 4 Mini
      'grok-4', // Grok 4
      'grok-4o-fast', // Grok 4 Fast
      'grok-4o-fast-preview', // Grok 4 Fast Preview
      'grok-3.5-turbo', // Grok 3.5 Turbo
      'grok-3.5-turbo-preview', // Grok 3.5 Turbo Preview
      'grok-3.5', // Grok 3.5
      'grok-3.5-fast', // Grok 3.5 Fast
      'grok-3.5-preview', // Grok 3.5 Preview
      'grok-3.5-sonnet', // Grok 3.5 Sonnet
      'grok-3.5-sonnet-preview' // Grok 3.5 Sonnet Preview
    ];

    const currentModel = this.getCurrentModel();
    const modelDisplay = availableModels.map(model => {
      const isCurrent = model === currentModel;
      const prefix = isCurrent ? '{teal-fg}►{/teal-fg}' : '  ';
      return `${prefix} ${model}${isCurrent ? '{/gold-fg} (current){/}' : ''}`;
    }).join('\n');

    this.renderManager.appendInfo(`{gold-fg}┌─ Available Models ─────────────────────┐
│                                          │
{modelDisplay}
│                                          │
│ {#9CA3AF-fg}Use:{/gold-fg} /model <name> {#9CA3AF-fg}to switch model     │
│                                          │
└──────────────────────────────────────────┘{/}`);
  }

  private showWorkLog(): void {
    this.renderManager.appendInfo('Work log feature not fully implemented in blessed UI. Use enhanced UI for full work log.');
  }

  private showStatus(): void {
    const currentModel = this.getCurrentModel();
    const currentDir = this.getCurrentDirectory();
    
    this.renderManager.appendInfo(`{gold-fg}┌─ System Status ─────────────────────┐
│ {#9CA3AF-fg}Directory:{/gold-fg} ${currentDir}                    │
│ {#9CA3AF-fg}Model:{/gold-fg} ${currentModel}                        │
│ {#9CA3AF-fg}UI:{/gold-fg} Blessed Unified Stream           │
│ {#9CA3AF-fg}State:{/gold-fg} ${this.uiState}                     │
│                                          │
└──────────────────────────────────────────┘{/}`);
  }

  private switchModel(modelName: string): void {
    if (!modelName) {
      this.renderManager.appendInfo('Usage: /model <model-name>\nAvailable models: grok-code-fast-1, grok-1, grok-beta');
      return;
    }
    // TODO: Implement model switching via adapter
    this.renderManager.appendInfo(`Model switching not yet implemented. Requested: ${modelName}`);
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

  private generatePastePreview(text: string): string {
    const maxPreviewLength = 200;
    const maxPreviewLines = 10;
    const lines = text.split('\n');
    
    // Truncate preview if too long
    let previewLines = lines.slice(0, maxPreviewLines);
    let preview = previewLines.join('\n');
    
    if (preview.length > maxPreviewLength) {
      preview = preview.substring(0, maxPreviewLength) + '...';
    } else if (lines.length > maxPreviewLines) {
      preview += '\n... (+ ' + (lines.length - maxPreviewLines) + ' more lines)';
    }
    
    // Escape any blessed formatting
    preview = preview.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    
    return preview;
  }

  private showPastePreview(preview: string, lineCount: number, charCount: number): void {
    const previewText = `
┌─ Paste Preview ─────────────────────────────────────┐
│ Lines: {#FFD700-fg}${lineCount}{/} | Characters: {#FFD700-fg}${charCount}{/} │
├─────────────────────────────────────────────────────┤
│ ${preview.replace(/\n/g, '\n│ ')} │
└─────────────────────────────────────────────────────┘
{#9CA3AF-fg}Press Enter to send, Escape to cancel{/}`;
    
    // Store original input value
    this.layout.inputBox['_originalValue'] = this.layout.inputBox.getValue();
    
    // Show preview in timeline
    this.layout.timelineBox.pushLine(previewText);
    this.layout.timelineBox.setScrollPerc(100);
    this.layout.screen.render();
  }

  private hidePastePreview(): void {
    // The preview will be cleared on next input or submit
    // We keep it simple - no complex preview management needed
  }

  shutdown(): void {
    this.layout.screen.destroy();
  }

  /**
   * Enhanced smooth scrolling with BrewVerse theme colors
   */
  private enhancedScroll(delta: number, source: string = 'user'): void {
    const maxScrollSteps = 5;
    const scrollStep = Math.max(1, Math.min(3, Math.abs(delta) / maxScrollSteps));
    
    // Apply smooth scroll with theme-aware visual feedback
    for (let i = 0; i < scrollStep; i++) {
      this.layout.timelineBox.scroll(delta > 0 ? 1 : -1);
      this.layout.screen.render();
      this.brewverseFlash(`scrolling ${delta > 0 ? 'down' : 'up'}`);
      
      // Brief delay for smooth animation
      setTimeout(() => {
        this.layout.timelineBox.scroll(delta > 0 ? 1 : -1);
        this.layout.screen.render();
      }, 50);
    }
    
    // Show brief scroll indicator in status bar
    if (Math.abs(delta) > maxScrollSteps) {
      this.renderManager.appendInfo(`${source} scrolling ${delta > 0 ? 'down' : 'up'} (${Math.abs(delta)} lines)`);
    }
  }

  private brewverseFlash(message: string): void {
    // Flash status bar with BrewGold for theme consistency
    this.renderManager.appendInfo(`{${BREWVERSE_THEME.colors.gold}-fg}${message}{/}`);
    }
}