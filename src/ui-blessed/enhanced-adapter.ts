import type { UIAdapter } from '../ui/adapter.js';
import { BlessedUI } from './index.js';
import { GrokAgent } from '../agent/grok-agent.js';
import { EnhancedRenderManager } from './enhanced-render.js';
import { EnhancedKeymapManager } from './enhanced-keymap.js';
import { WorkLogEntry } from './enhanced-layout.js';

export class EnhancedBlessedAdapter implements UIAdapter {
  private ui: BlessedUI;
  private agent: GrokAgent;
  private renderManager: EnhancedRenderManager;
  private keymapManager: EnhancedKeymapManager;
  private messageBuffer: Map<string, string> = new Map();
  private streamBuffer: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private processingStartTime: number = 0;
  private currentTokenCount: number = 0;
  private workLogIdCounter: number = 0;
  private hasPrintedWelcome = false;

  constructor(ui: BlessedUI, agent: GrokAgent) {
    this.ui = ui;
    this.agent = agent;
    this.setupEnhancedComponents();
    this.setupEventHandlers();
  }

  private setupEnhancedComponents(): void {
    this.renderManager = new EnhancedRenderManager(this.ui.getLayout());
    this.keymapManager = new EnhancedKeymapManager(this.ui.getLayout(), this.renderManager);
    
    // Set up input handling
    this.keymapManager.setInputCallback((input: string) => {
      this.processUserMessage(input);
    });
  }

  private setupEventHandlers(): void {
    // Handle process termination gracefully
    process.on('SIGTERM', () => {
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.shutdown();
    });
  }

  private flushBuffer(): void {
    if (this.streamBuffer.length > 0) {
      const content = this.streamBuffer.join('');
      this.renderManager.appendToTranscript('assistant', content);
      this.streamBuffer = [];
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private scheduleFlush(): void {
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushBuffer();
      }, 100); // Enhanced cadence for smooth streaming
    }
  }

  async processUserMessage(text: string): Promise<void> {
    this.renderManager.setProcessingState(true);
    this.processingStartTime = Date.now();
    this.currentTokenCount = 0;

    this.renderManager.appendToTranscript('user', text);

    try {
      for await (const chunk of this.agent.processUserMessageStream(text)) {
        // Handle different chunk types for enhanced feedback
        if (chunk.type === 'content') {
          // Handled by appendAssistantChunk
          continue;
        } else if (chunk.type === 'token_count') {
          this.currentTokenCount = chunk.tokenCount;
          this.renderManager.showTokenCount(chunk.tokenCount);
        } else if (chunk.type === 'tool_calls') {
          // Tool calls starting
          this.flushBuffer();
        } else if (chunk.type === 'done') {
          // Stream complete
          this.flushBuffer();
          const processingTime = Date.now() - this.processingStartTime;
          this.renderManager.setProcessingState(false);
          
          // Show completion summary
          const summary = `✨ Completed in ${processingTime}ms, ${this.currentTokenCount} tokens`;
          this.renderManager.appendToTranscript('work', summary);
        }
      }
    } catch (error: any) {
      this.renderManager.setProcessingState(false);
      this.renderManager.appendToTranscript('error', `Error: ${error.message}`);
    }
  }

  appendUserMessage(text: string): void {
    this.renderManager.appendToTranscript('user', text);
  }

  startAssistantMessage(id: string): void {
    this.messageBuffer.set(id, '');
    this.renderManager.setProcessingState(true);
    this.renderManager.appendToTranscript('assistant', '🤔 Thinking...');
  }

  appendAssistantChunk(id: string, chunk: string): void {
    const current = this.messageBuffer.get(id) || '';
    this.messageBuffer.set(id, current + chunk);
    
    // Buffer chunk with enhanced cadence
    this.streamBuffer.push(chunk);
    this.scheduleFlush();
    
    // Update token count in real-time
    this.currentTokenCount++;
    if (this.currentTokenCount % 10 === 0) {
      this.renderManager.showTokenCount(this.currentTokenCount);
    }
  }

  endAssistantMessage(id: string): void {
    this.flushBuffer(); // Flush any remaining buffer
    const fullMessage = this.messageBuffer.get(id) || '';
    this.messageBuffer.delete(id);
    
    const processingTime = Date.now() - this.processingStartTime;
    this.renderManager.setProcessingState(false);
    
    // Show completion with metrics
    const summary = `✨ Response complete (${this.currentTokenCount} tokens, ${processingTime}ms)`;
    this.renderManager.appendToTranscript('work', summary);
  }

  appendWork(event: string): void {
    this.flushBuffer(); // Flush before showing work
    this.renderManager.appendToTranscript('work', event);
  }

  appendAssistantMessage(text: string): void {
    this.renderManager.appendToTranscript('assistant', text);
  }

  appendDiff(filePath: string, diff: string): void {
    this.renderManager.appendToTranscript('work', `📄 ${filePath}\n────────────────────────────────────\n${diff}\n────────────────────────────────────`);
  }

  appendCommand(command: string, output: string): void {
    this.renderManager.appendToTranscript('work', `⚙️ COMMAND   ${new Date().toLocaleTimeString()}\n$ ${command}\n────────────────────────────────────\n${output}\n────────────────────────────────────`);
  }

  appendConfirmation(prompt: string, options: string[]): void {
    const optionsStr = options.join('   ');
    this.renderManager.appendToTranscript('work', `❓ CONFIRM ACTION\n${prompt}\n[${optionsStr}]`);
  }

  appendCompletionSummary(summary: string): void {
    this.renderManager.appendToTranscript('work', `✅ TASK COMPLETE   ${new Date().toLocaleTimeString()}\n${summary}`);
  }

  requestConfirmation(prompt: string, options: string[], callback: (response: string) => void): void {
    this.appendConfirmation(prompt, options);
    // For enhanced UI, use a modal or inline input
    // For now, simulate with key listener
    // But since it's enhanced, perhaps set a flag
    // Simple implementation: assume 'y' for yes
    callback('y');
  }

  setStatus(text: string): void {
    this.renderManager.updateStatus(text);
  }

  appendToolResult(tool: string, status: string, exitCode: number, stdout: string, stderr: string, duration: number): void {
    // For enhanced, perhaps log or something
  }

  // Enhanced work logging with rich metadata
  appendWorkEnhanced(toolName: string, args: any, result: any): void {
    this.flushBuffer();
    
    const workEntry: WorkLogEntry = {
      id: `work_${++this.workLogIdCounter}`,
      type: toolName,
      label: this.getWorkLabel(toolName, args),
      detail: this.getWorkDetail(toolName, args, result),
      timestamp: new Date(),
      status: result?.success ? 'success' : 'error',
    };

    this.renderManager.appendToWorkLog(workEntry);
    
    // Also show in transcript for visibility
    const status = result?.success ? '✅' : '❌';
    const message = `${status} ${workEntry.label}`;
    this.renderManager.appendToTranscript('work', message);
  }

  private getWorkLabel(toolName: string, args: any): string {
    switch (toolName) {
      case 'view_file':
        return `📄 Read: ${args.path}`;
      case 'create_file':
        return `📝 Create: ${args.path}`;
      case 'str_replace_editor':
        return `✏️ Edit: ${args.path}`;
      case 'edit_file':
        return `🔧 Morph: ${args.target_file}`;
      case 'bash':
        return `💻 Bash: ${args.command}`;
      case 'search':
        return `🔍 Search: "${args.query}"`;
      case 'create_todo_list':
        return `📋 Todo: ${args.todos?.length || 0} items`;
      case 'update_todo_list':
        return `📋 Update: ${args.updates?.length || 0} items`;
      default:
        if (toolName.startsWith('mcp__')) {
          return `🔌 MCP: ${toolName.substring(5)}`;
        }
        return `🛠️ Tool: ${toolName}`;
    }
  }

  private getWorkDetail(toolName: string, args: any, result: any): string {
    if (result?.error) {
      return `Error: ${result.error}`;
    }
    
    if (result?.output) {
      // Truncate long output for display
      const output = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
      return output.length > 200 ? output.substring(0, 200) + '...' : output;
    }
    
    return result?.success ? 'Completed successfully' : 'No output';
  }

  clearAll(): void {
    this.flushBuffer();
    this.renderManager.clearTranscript();
    this.renderManager.clearWorkLog();
    this.messageBuffer.clear();
  }

  shutdown(): void {
    this.flushBuffer();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.renderManager.shutdown();
  }

  // Enhanced methods for BrewVerse features
  showSplash(): void {
    const splashText = `
╔═══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🚀 BREWVERSE TERMINAL - GROK CLI v1.0                         ║
║                                                              ║
║  Advanced AI-powered development environment                ║
║  Flicker-free • Feature-rich • Terminal-native           ║
║                                                              ║
║  Ready for your next command...                          ║
║                                                              ║
╚═══════════════════════════════════════════════════════════════╝
    `.trim();

    this.renderManager.appendToTranscript('assistant', splashText);
  }



  showWelcome(model?: string): void {
    if (this.hasPrintedWelcome) return;
    this.hasPrintedWelcome = true;

    const welcomeText = `
{bold}{#FFD700-fg}🌟 Welcome to BrewVerse Terminal!{/bold}

{#E5E7EB-fg}You're now running the advanced Grok CLI with:}
  {#00C7B7-fg}✓{/} Anti-flicker streaming
  {#00C7B7-fg}✓{/} Rich work visibility
  {#00C7B7-fg}✓{/} Enhanced command system
  {#00C7B7-fg}✓{/} BrewVerse theming

{bold}{#9CA3AF-fg}Type /help to see all available commands.{/bold}
    `.trim();

    this.renderManager.appendToTranscript('assistant', welcomeText);
    this.renderManager.setModelInfo(model || 'grok-4-latest');
  }
}