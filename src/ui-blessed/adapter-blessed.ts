import type { UIAdapter } from '../ui/adapter.js';
import { BlessedUI } from './index.js';
import { GrokAgent } from '../agent/grok-agent.js';
import { ConfirmationService } from '../utils/confirmation-service.js';
import { emitEvent } from './unified-renderer.js';
import { MutationPlanBuilder, ExecutionStateManager } from './mutation-plan.js';
import { GrokToolCall } from '../grok/client.js';

export class BlessedAdapter implements UIAdapter {
  private ui: BlessedUI;
  private agent: GrokAgent;
  private messageBuffer: Map<string, string> = new Map();
  private streamBuffer: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 100; // ms
  private hasStartedResponding = false;
  private confirmationService = ConfirmationService.getInstance();

  // Normalization state
  private currentAssistantId: string | null = null;
  private currentToolCall: { tool: string; command: string; cwd: string; startTime: number } | null = null;

  // Batch processing for MutationPlan
  private planBuilder: MutationPlanBuilder | null = null;
  private executionStateManager: ExecutionStateManager;
  private collectedDiffs: Array<{filePath: string, diff: string}> = [];
  private collectedCommands: Array<{command: string, output: string}> = [];
  private collectedToolCalls: GrokToolCall[] = [];
  private isBatchMode = true; // For Blessed TUI, batch mutations

  constructor(ui: BlessedUI, agent: GrokAgent) {
    this.ui = ui;
    this.agent = agent;
    this.executionStateManager = new ExecutionStateManager();

    // Listen for confirmation requests
    this.confirmationService.on('confirmation-requested', (options: any) => {
      this.ui.requestConfirmation(
        `Run ${options.operation}: ${options.filename}?`,
        ['y', 'n', 'a'],
        (response: string) => {
          const confirmed = response === 'yes' || response === 'all';
          const dontAskAgain = response === 'all';
          this.confirmationService.confirmOperation(confirmed, dontAskAgain);
        }
      );
    });
  }

  private flushBuffer() {
    if (this.streamBuffer.length > 0) {
      const content = this.streamBuffer.join('');
      this.ui.appendAssistant(content);
      this.streamBuffer = [];
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private scheduleFlush() {
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushBuffer();
      }, this.FLUSH_INTERVAL);
    }
  }

  async processUserMessage(text: string): Promise<void> {
    // Start batch mode
    this.startBatchProcessing();

    // Emit user message event through unified pipeline
    emitEvent('user_message', { content: text });

    // Set thinking state
    this.executionStateManager.transition('THINKING');

    for await (const chunk of this.agent.processUserMessageStream(text)) {
      if (chunk.type === 'tool_plan') {
        this.collectedToolCalls = chunk.toolCalls;
      }
    }

    // End batch processing
    await this.endBatchProcessing();
  }

  private startBatchProcessing(): void {
    this.planBuilder = new MutationPlanBuilder();
    this.collectedDiffs = [];
    this.collectedCommands = [];
    this.executionStateManager.transition('PLANNING');
  }

  private async endBatchProcessing(): Promise<void> {
    if (!this.planBuilder) return;

    // Build plan from collected tool calls
    for (const toolCall of this.collectedToolCalls) {
      this.buildPlanFromToolCall(toolCall);
    }

    const plan = this.planBuilder.build();
    this.executionStateManager.transition('PREVIEW_READY');

    // Show previews
    this.showPreviews(plan);

    // If there are mutations, confirm
    if (plan.items.length > 0) {
      this.executionStateManager.transition('PENDING_CONFIRMATION');
      const confirmed = await this.requestConfirmationForPlan(plan);
      if (confirmed) {
        await this.executePlan(plan);
      }
    } else {
      this.executionStateManager.transition('DONE');
    }

    // Stop thinking animation
    (this.ui as any).renderManager.stopThinking();

    this.planBuilder = null;
  }

  private buildPlanFromToolCall(toolCall: GrokToolCall): void {
    if (!this.planBuilder) return;

    const name = toolCall.function.name;
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      args = {};
    }

    if (name === 'str_replace_editor' || name === 'edit_file') {
      this.planBuilder.addItem('PATCH_FILE', args.file_path, `Edit ${args.file_path}`, { toolCall });
    } else if (name === 'create_file') {
      this.planBuilder.addItem('WRITE_FILE', args.file_path, `Create ${args.file_path}`, { toolCall });
    } else if (name === 'bash') {
      this.planBuilder.addItem('RUN_BASH', args.command, args.command, { toolCall, workingDirectory: args.cwd });
    } else {
      this.planBuilder.addItem('OTHER', name, `${name} operation`, { toolCall });
    }
  }

  private showPreviews(plan: any): void {
    for (const item of plan.items) {
      if (item.type === 'PATCH_FILE') {
        // For file edits, we need to simulate the diff
        // Since we don't have the actual diff yet, show placeholder
        emitEvent('diff_preview', {
          filePath: item.target,
          changes: { added: 0, removed: 0 },
          diff: `Preview: ${item.preview}`
        });
      } else if (item.type === 'RUN_BASH') {
        // Show command preview
        emitEvent('system_notice', { level: 'info', message: `Command: ${item.preview}` });
      }
    }
  }

  private async requestConfirmationForPlan(plan: any): Promise<boolean> {
    // Use the unified renderer to show the plan
    const renderer = (this.ui as any).unifiedRenderer;
    if (renderer && renderer.renderMutationPlan) {
      renderer.renderMutationPlan(plan);
    }

    return new Promise((resolve) => {
      // Set up single-keystroke confirmation handling
      const screen = (this.ui as any).layout.screen;
      const inputBox = (this.ui as any).layout.inputBox;

      // Hide input box during confirmation
      inputBox.hide();

      const keyHandler = (ch: string, key: any) => {
        if (key.name === 'escape' || ch === 'n' || ch === 'N') {
          screen.removeListener('keypress', keyHandler);
          inputBox.show();
          inputBox.focus();
          screen.render();
          resolve(false);
        } else if (ch === 'y' || ch === 'Y' || key.name === 'return') {
          screen.removeListener('keypress', keyHandler);
          inputBox.show();
          inputBox.focus();
          screen.render();
          resolve(true);
        } else if (ch === 'a' || ch === 'A') {
          // Apply all - enable auto-approve
          this.executionStateManager.setAutoApprove(true);
          screen.removeListener('keypress', keyHandler);
          inputBox.show();
          inputBox.focus();
          screen.render();
          resolve(true);
        }
        // Other keys (v, d) could be handled for details/diff view
      };

      screen.on('keypress', keyHandler);

      // Show confirmation prompt
      const prompt = `{gold-fg}Choose action: [Y] Apply  [N] Cancel  [A] Apply all  [Esc] Cancel{/}`;
      (this.ui as any).layout.timelineBox.pushLine(`│ ${prompt}`);
      (this.ui as any).layout.timelineBox.setScrollPerc(100);
      screen.render();
    });
  }

  private async executePlan(plan: any): Promise<void> {
    this.executionStateManager.transition('EXECUTING');
    for (const item of plan.items) {
      if (item.toolCall) {
        const result = await this.agent.executeToolCall(item.toolCall);
        emitEvent('tool_result', {
          toolCall: item.toolCall,
          success: result.success,
          output: result.output,
          error: result.error,
          duration: 0
        });
      }
    }
    this.executionStateManager.transition('DONE');
  }

  appendUserMessage(text: string): void {
    // Handled in UI now
  }

  startAssistantMessage(id: string): void {
    this.currentAssistantId = id;
    this.messageBuffer.set(id, '');
    this.hasStartedResponding = false;
    emitEvent('assistant_stage', { stage: 'preparing', description: 'BrewGrok is analyzing your request...' });
  }

  appendAssistantChunk(id: string, chunk: string): void {
    const current = this.messageBuffer.get(id) || '';
    this.messageBuffer.set(id, current + chunk);
    // Buffer the chunk
    this.streamBuffer.push(chunk);
    this.scheduleFlush();

    if (!this.hasStartedResponding) {
      this.hasStartedResponding = true;
      emitEvent('assistant_stage', { stage: 'responding', description: 'BrewGrok is crafting response...' });
    }
  }

  endAssistantMessage(id: string): void {
    this.flushBuffer(); // Flush remaining buffer
    const fullMessage = this.messageBuffer.get(id) || '';
    this.messageBuffer.delete(id);
    if (fullMessage.trim()) {
      emitEvent('assistant_message', { content: fullMessage.trim() });
    }
    this.currentAssistantId = null;
  }

  appendAssistantMessage(text: string): void {
    emitEvent('assistant_message', { content: text });
  }

  appendDiff(filePath: string, diff: string): void {
    if (this.isBatchMode && this.planBuilder) {
      // Collect for batch processing
      this.collectedDiffs.push({ filePath, diff });
      // Add to plan
      this.planBuilder.addItem('PATCH_FILE', filePath, diff);
    } else {
      const lines = diff.split('\n');
      const addedLines = lines.filter(line => line.startsWith('+')).length;
      const removedLines = lines.filter(line => line.startsWith('-')).length;

      emitEvent('diff_preview', {
        filePath,
        changes: { added: addedLines, removed: removedLines },
        diff: diff
      });
    }
  }

  appendCommand(command: string, output: string): void {
    if (this.isBatchMode && this.planBuilder) {
      // Collect for batch processing
      this.collectedCommands.push({ command, output });
      // Add to plan
      this.planBuilder.addItem('RUN_BASH', command, output);
    } else {
      emitEvent('tool_result', {
        toolCall: { function: { name: 'bash' } },
        success: true,
        output,
        duration: 0
      });
    }
  }

  appendConfirmation(prompt: string, options: string[]): void {
    // Handled by requestConfirmation
  }

  appendCompletionSummary(summary: string): void {
    emitEvent('system_notice', { level: 'info', message: `✅ ${summary}` });
  }

  requestConfirmation(prompt: string, options: string[], callback: (response: string) => void): void {
    this.ui.requestConfirmation(prompt, options, callback);
  }

  appendWork(event: string): void {
    this.flushBuffer(); // Flush before showing work
    const startTime = Date.now();
    this.currentToolCall = {
      tool: 'bash',
      command: event,
      cwd: process.cwd(),
      startTime
    };
    
    emitEvent('assistant_stage', { stage: 'working', description: `Executing: ${event}...` });

    // Simulate completion after 1 second (for testing)
    setTimeout(() => {
      if (this.currentToolCall && this.currentToolCall.command === event) {
        const duration = Date.now() - startTime;
        emitEvent('tool_result', {
          toolCall: { function: { name: 'bash' } },
          success: true,
          output: '/home/brewexec/grok-cli\n',
          duration
        });
        this.currentToolCall = null;
      }
    }, 1000);
  }

  appendToolResult(tool: string, status: string, exitCode: number, stdout: string, stderr: string, duration: number): void {
    if (this.currentToolCall) {
      emitEvent('tool_result', {
        toolCall: { function: { name: tool } },
        success: status === 'success',
        output: stdout,
        error: stderr,
        duration
      });
      this.currentToolCall = null;
    }
  }

  setStatus(text: string): void {
    this.ui.setStatus(text);
    // Also emit as system notice for debugging if needed
    if (text.includes('Error') || text.includes('Failed')) {
      emitEvent('system_notice', { level: 'warning', message: text });
    }
  }

  clearAll(): void {
    this.flushBuffer();
    this.ui.clearAll();
    this.messageBuffer.clear();
  }

  shutdown(): void {
    this.ui.shutdown();
  }
}