import blessed from 'neo-blessed';
import { LayoutElements } from './layout.js';

export class RenderManager {
  private layout: LayoutElements;
  private eventKeys: Set<string> = new Set();
  private isThinkingVisible = false;
  public isFirstAssistantInResponse = false;

  constructor(layout: LayoutElements) {
    this.layout = layout;
  }

  private appendEvent(type: string, title: string, body?: string) {
    const key = `${type}:${title}:${Date.now()}`;
    if (this.eventKeys.has(key)) return; // De-dupe
    this.eventKeys.add(key);
    if (this.eventKeys.size > 500) {
      // Keep only last 500
      const first = this.eventKeys.values().next().value;
      this.eventKeys.delete(first);
    }

    let content = '';
    if (type === 'USER') {
      content += `{teal-fg}👤 User:{/teal-fg} ${title}`;
    } else if (type === 'ASSISTANT') {
      content += `{yellow-fg}🤖 Assistant:{/yellow-fg} ${title}`;
    } else if (type === 'TOOL_CALL') {
      content += `{blue-fg}🛠 Tool: ${title}{/blue-fg}`;
    } else if (type === 'TOOL_RESULT') {
      content += `{blue-fg}🛠 Result:{/blue-fg} ${title}`;
    } else if (type === 'DIFF') {
      content += `{cyan-fg}📄 Diff: ${title}{/cyan-fg}`;
    } else if (type === 'COMMAND') {
      content += `{magenta-fg}⚙️ ${title}{/magenta-fg}`;
    } else if (type === 'ERROR') {
      content += `{red-fg}⚠️ ${title}{/red-fg}`;
    } else if (type === 'INFO') {
      content += `{gray-fg}ℹ️ ${title}{/gray-fg}`;
    } else if (type === 'THINKING') {
      content += `{yellow-fg}🤖 ${title}{/yellow-fg}`;
    } else {
      content += `${type}: ${title}`;
    }

    if (body) {
      content += `\n${body}`;
    }

    this.layout.timelineBox.pushLine(content);
    this.layout.timelineBox.setScrollPerc(100);
    this.layout.screen.render();
  }

  appendUser(text: string) {
    this.appendEvent('USER', text);
  }

  appendAssistant(text: string) {
    if (this.isFirstAssistantInResponse) {
      // Show BrewGrok header once per response
      let content = `{gold-fg}BrewGrok{/gold-fg}\n${text}`;
      this.layout.timelineBox.pushLine(content);
      this.layout.timelineBox.setScrollPerc(100);
      this.layout.screen.render();
      this.isFirstAssistantInResponse = false;
    } else {
      // Continuation without header
      this.layout.timelineBox.pushLine(text);
      this.layout.timelineBox.setScrollPerc(100);
      this.layout.screen.render();
    }
  }

  appendThinking(text: string) {
    if (!this.isThinkingVisible) {
      this.appendEvent('THINKING', text);
      this.isThinkingVisible = true;
    }
  }

  clearThinking() {
    this.isThinkingVisible = false;
  }

  appendToolCall(tool: string, command: string, cwd: string) {
    const body = `Command: ${command}\nCWD: ${cwd}`;
    this.appendEvent('TOOL_CALL', tool, body);
  }

  appendToolResult(tool: string, status: string, exitCode: number, stdout: string, stderr: string, duration: number) {
    const summary = status === 'success' ? 'success' : `failed (${exitCode})`;
    const title = `${tool} (${summary} · ${duration}ms)`;
    this.appendEvent('TOOL_RESULT', title);
    // Collapsed by default - no body shown
  }

  appendDiff(filePath: string, diffLines: string[]) {
    const truncated = diffLines.slice(0, 160);
    let body = truncated.map(line => {
      if (line.startsWith('-')) return `- ${line.slice(1)}`;
      if (line.startsWith('+')) return `+ ${line.slice(1)}`;
      return `  ${line}`;
    }).join('\n');
    if (diffLines.length > 160) body += '\n… (diff truncated)';
    this.appendEvent('DIFF', filePath, body);
  }

  appendCommand(command: string, output: string): void {
    // Summary only
    const lines = output.split('\n');
    const title = `bash: ${command} (${lines.length} lines)`;
    this.appendEvent('COMMAND', title);
  }

  appendError(title: string, stack?: string) {
    this.appendEvent('ERROR', title, stack);
  }

  appendInfo(title: string) {
    this.appendEvent('INFO', title);
  }

  showConfirm(prompt: string) {
    const content = `\n────────────────────────────────\nBrewGrok\nI’m about to ${prompt}\n\nProceed?\n[Y] Yes   [N] No   [A] Yes to all   [Esc] Cancel\n────────────────────────────────\n`;
    this.layout.timelineBox.pushLine(content);
    this.layout.timelineBox.setScrollPerc(100);
    this.layout.screen.render();
  }

  hideConfirm() {
    // No need to hide, as it's part of timeline
  }

  setStatus(text: string) {
    this.layout.screen.title = `BrewGrok CLI - Unified Stream - ${text}`;
    this.layout.screen.render();
  }

  focusInput() {
    this.layout.inputBox.focus();
    this.layout.screen.render();
  }

  clearInput() {
    this.layout.inputBox.clearValue();
    this.layout.screen.render();
  }

  render() {
    this.layout.screen.render();
  }
}