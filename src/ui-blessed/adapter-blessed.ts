import type { UIAdapter } from '../ui/adapter.js';
import { BlessedUI } from './index.js';
import { GrokAgent } from '../agent/grok-agent.js';
import { ConfirmationService } from '../utils/confirmation-service.js';

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

  constructor(ui: BlessedUI, agent: GrokAgent) {
    this.ui = ui;
    this.agent = agent;

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
    for await (const chunk of this.agent.processUserMessageStream(text)) {
      // Handle chunks if needed, but since agent already calls adapter methods, maybe nothing here
    }
  }

  appendUserMessage(text: string): void {
    // Handled in UI now
  }

  startAssistantMessage(id: string): void {
    this.currentAssistantId = id;
    this.messageBuffer.set(id, '');
    this.hasStartedResponding = false;
    this.ui.appendThinking('Working: preparing response...');
  }

  appendAssistantChunk(id: string, chunk: string): void {
    const current = this.messageBuffer.get(id) || '';
    this.messageBuffer.set(id, current + chunk);
    // Buffer the chunk
    this.streamBuffer.push(chunk);
    this.scheduleFlush();

    if (!this.hasStartedResponding) {
      this.hasStartedResponding = true;
      this.ui.appendThinking('Responding...');
    }
  }

  endAssistantMessage(id: string): void {
    this.flushBuffer(); // Flush remaining buffer
    const fullMessage = this.messageBuffer.get(id) || '';
    this.messageBuffer.delete(id);
    if (fullMessage.trim()) {
      this.ui.appendAssistant(fullMessage.trim());
    }
    this.ui.clearThinking();
    this.currentAssistantId = null;
  }

  appendAssistantMessage(text: string): void {
    this.ui.appendAssistant(text);
  }

  appendDiff(filePath: string, diff: string): void {
    const lines = diff.split('\n');
    this.ui.appendDiff(filePath, lines);
  }

  appendCommand(command: string, output: string): void {
    this.ui.appendCommand(command, output);
  }

  appendConfirmation(prompt: string, options: string[]): void {
    // Handled by requestConfirmation
  }

  appendCompletionSummary(summary: string): void {
    this.ui.appendInfo(`TASK COMPLETE: ${summary}`);
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
    this.ui.appendThinking(`Working: running bash...`);

    // Simulate completion after 1 second (for testing)
    setTimeout(() => {
      if (this.currentToolCall && this.currentToolCall.command === event) {
        const duration = Date.now() - startTime;
        this.ui.appendToolResult('bash', 'success', 0, '/home/brewexec/grok-cli\n', '', duration);
        this.currentToolCall = null;
      }
    }, 1000);
  }

  appendToolResult(tool: string, status: string, exitCode: number, stdout: string, stderr: string, duration: number): void {
    if (this.currentToolCall) {
      this.ui.appendToolResult(tool, status, exitCode, stdout, stderr, duration);
      this.currentToolCall = null;
    }
  }

  setStatus(text: string): void {
    this.ui.setStatus(text);
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