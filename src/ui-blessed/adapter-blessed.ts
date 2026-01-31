import { UIAdapter } from '../adapter.js';
import { BlessedUI } from './index.js';
import { GrokAgent } from '../../agent/grok-agent.js';

export class BlessedAdapter implements UIAdapter {
  private ui: BlessedUI;
  private agent: GrokAgent;
  private messageBuffer: Map<string, string> = new Map();
  private streamBuffer: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 100; // ms

  constructor(ui: BlessedUI, agent: GrokAgent) {
    this.ui = ui;
    this.agent = agent;
  }

  private flushBuffer() {
    if (this.streamBuffer.length > 0) {
      const content = this.streamBuffer.join('');
      this.ui.appendToTranscript(`Assistant: ${content}`);
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
    this.ui.appendToTranscript(`User: ${text}`);
  }

  startAssistantMessage(id: string): void {
    this.messageBuffer.set(id, '');
  }

  appendAssistantChunk(id: string, chunk: string): void {
    const current = this.messageBuffer.get(id) || '';
    this.messageBuffer.set(id, current + chunk);
    // Buffer the chunk
    this.streamBuffer.push(chunk);
    this.scheduleFlush();
  }

  endAssistantMessage(id: string): void {
    this.flushBuffer(); // Flush remaining buffer
    const fullMessage = this.messageBuffer.get(id) || '';
    // Already appended in chunks, but could finalize here
    this.messageBuffer.delete(id);
  }

  appendWork(event: string): void {
    this.flushBuffer(); // Flush before showing work
    this.ui.appendToWorkLog(event);
  }

  setStatus(text: string): void {
    this.ui.setStatus(text);
  }

  clearAll(): void {
    this.flushBuffer();
    this.ui.clearTranscript();
    this.ui.clearWorkLog();
    this.messageBuffer.clear();
  }

  shutdown(): void {
    this.ui.shutdown();
  }
}