import blessed, { Widgets } from 'neo-blessed';
import { LayoutElements, WorkLogEntry } from './enhanced-layout.js';
import { BREWVERSE_THEME, UI_CONSTANTS } from './theme.js';

export class EnhancedRenderManager {
  private layout: LayoutElements;
  private worklogVisible = true;
  private autoScrollEnabled = true;
  private renderQueue: Array<() => void> = [];
  private isRendering = false;
  private renderTimer: NodeJS.Timeout | null = null;
  private messageHistory: string[] = [];
  private workLogEntries: WorkLogEntry[] = [];
  private userScrolledUp = false;
  private pendingOutputCount = 0;

  constructor(layout: LayoutElements) {
    this.layout = layout;
    this.setupAutoScrollBehavior();
    this.startRenderLoop();
  }

  private setupAutoScrollBehavior(): void {
    // Monitor user scroll to control auto-scroll
    this.layout.transcript.on('scroll', () => {
      const scrollPercentage = this.layout.transcript.getScrollPerc();
      this.userScrolledUp = scrollPercentage < 95;
      
      if (this.userScrolledUp) {
        this.showPendingIndicator();
      } else {
        this.hidePendingIndicator();
      }
    });

    // Mouse wheel support for better control
    this.layout.transcript.key(['wheelup', 'wheeldown'], (ch, key) => {
      if (key.full === 'wheelup' || key.full === 'wheeldown') {
        this.userScrolledUp = true;
      }
    });
  }

  private startRenderLoop(): void {
    setInterval(() => {
      this.processRenderQueue();
    }, UI_CONSTANTS.RENDER_FPS);
  }

  private processRenderQueue(): void {
    if (this.isRendering || this.renderQueue.length === 0) return;
    
    this.isRendering = true;
    
    while (this.renderQueue.length > 0) {
      const renderOp = this.renderQueue.shift();
      if (renderOp) renderOp();
    }
    
    this.layout.screen.render();
    this.isRendering = false;
  }

  private queueRender(renderOp: () => void): void {
    this.renderQueue.push(renderOp);
  }

  private showPendingIndicator(): void {
    this.layout.status.setContent(`↓ New output (${this.pendingOutputCount})`);
  }

  private hidePendingIndicator(): void {
    this.layout.status.setContent('● Ready');
    this.pendingOutputCount = 0;
  }

  // Enhanced message formatting (simplified for compatibility)
  private formatMessage(type: string, content: string, metadata?: any): string {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (type) {
      case 'user':
        return `👤 BrewUser [${timestamp}]\n${content}\n\n`;
      
      case 'assistant':
        return `🤖 BrewGrok [${timestamp}]\n${content}\n\n`;
      
      case 'tool':
        const toolIcon = metadata?.status === 'error' ? '❌' : '⚡';
        return `${toolIcon} ${metadata?.toolName || 'Tool'} [${timestamp}]\n${content}\n\n`;
      
      case 'error':
        return `🚨 Error [${timestamp}]\n${content}\n\n`;
      
      case 'work':
        return `▸ ${content} [${timestamp}]\n`;
      
      default:
        return `${content}\n\n`;
    }
  }

  appendToTranscript(type: string, content: string, metadata?: any): void {
    const formattedMessage = this.formatMessage(type, content, metadata);
    this.messageHistory.push(formattedMessage);
    
    // Limit rendered entries for performance
    if (this.messageHistory.length > UI_CONSTANTS.RENDER_WINDOW) {
      this.renderRecentMessages();
    } else {
      this.queueRender(() => {
        this.layout.transcript.pushLine(formattedMessage);
      });
    }
    
    if (this.autoScrollEnabled && !this.userScrolledUp) {
      this.queueRender(() => {
        this.layout.transcript.setScrollPerc(100);
      });
    }
    
    this.pendingOutputCount++;
    if (this.userScrolledUp) {
      this.showPendingIndicator();
    }
  }

  private renderRecentMessages(): void {
    this.queueRender(() => {
      const recentMessages = this.messageHistory.slice(-UI_CONSTANTS.RENDER_WINDOW);
      this.layout.transcript.setContent(recentMessages.join(''));
    });
  }

  appendToWorkLog(entry: WorkLogEntry): void {
    this.workLogEntries.push(entry);
    
    // Limit work log entries
    if (this.workLogEntries.length > UI_CONSTANTS.WORK_LOG_MAX) {
      this.workLogEntries = this.workLogEntries.slice(-UI_CONSTANTS.WORK_LOG_MAX);
    }
    
    this.queueRender(() => {
      const formattedEntry = this.formatWorkLogEntry(entry);
      this.layout.worklog.pushLine(formattedEntry);
      this.layout.worklog.setScrollPerc(100);
    });
  }

  private formatWorkLogEntry(entry: WorkLogEntry): string {
    const statusIcon = entry.status === 'success' ? '✅' : entry.status === 'error' ? '❌' : '⏳';
    const time = entry.timestamp.toLocaleTimeString();
    return `{#9CA3AF-fg}${statusIcon} ${entry.label} [${time}]{/}`;
  }

  clearTranscript(): void {
    this.queueRender(() => {
      this.messageHistory = [];
      this.layout.transcript.setContent('');
      this.hidePendingIndicator();
    });
  }

  clearWorkLog(): void {
    this.queueRender(() => {
      this.workLogEntries = [];
      this.layout.worklog.setContent('');
    });
  }

  updateStatus(text: string, isError: boolean = false): void {
    this.queueRender(() => {
      this.layout.status.setContent(text);
      this.layout.screen.title = `BrewVerse Terminal - ${text}`;
    });
  }

  setModelInfo(model: string): void {
    this.queueRender(() => {
      this.layout.modelInfo.setContent(`{#9CA3AF-fg}Model: ${model}{/}`);
    });
  }

  toggleWorkLog(): void {
    this.worklogVisible = !this.worklogVisible;
    this.queueRender(() => {
      if (this.worklogVisible) {
        this.layout.worklog.show();
        this.layout.chat.width = '70%';
      } else {
        this.layout.worklog.hide();
        this.layout.chat.width = '100%';
      }
    });
  }

  focusInput(): void {
    this.queueRender(() => {
      this.layout.input.focus();
    });
  }

  clearInput(): void {
    this.queueRender(() => {
      this.layout.input.clearValue();
    });
  }

  scrollToBottom(): void {
    this.userScrolledUp = false;
    this.autoScrollEnabled = true;
    this.queueRender(() => {
      this.layout.transcript.setScrollPerc(100);
      this.hidePendingIndicator();
    });
  }

  setProcessingState(isProcessing: boolean, model?: string): void {
    if (isProcessing) {
      this.updateStatus('🤔 Thinking...');
    } else {
      this.updateStatus('● Ready');
    }
    
    if (model) {
      this.setModelInfo(model);
    }
  }

  showTokenCount(count: number): void {
    const status = count > 0 
      ? `📊 Tokens: ${count}`
      : '● Ready';
    this.updateStatus(status);
  }

  render(): void {
    this.processRenderQueue();
  }

  shutdown(): void {
    if (this.renderTimer) {
      clearInterval(this.renderTimer);
    }
    this.layout.screen.destroy();
  }
}