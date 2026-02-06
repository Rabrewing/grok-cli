/**
 * Unified Timeline Renderer - Single Source of Truth for BrewGrok TUI
 *
 * ENFORCED: All output MUST flow through this renderer.
 * No component may render directly to screen.
 */

import blessed from 'neo-blessed';
import { LayoutElements } from './layout.js';
import { BREWVERSE_THEME } from './theme.js';
import {
  TimelineEvent,
  TimelineEventType,
  UserMessageData,
  AssistantMessageData,
  AssistantStageData,
  ToolInvocationData,
  ToolResultData,
  DiffPreviewData,
  SystemNoticeData,
  TimelineEventGroup
} from '../ui/timeline-renderer.js';
import {
  MutationPlan,
  ExecutionState,
  MutationPlanItem,
  ExecutionReport,
  ExecutionResult,
  RiskLevel
} from './mutation-plan.js';

interface MessageGroup {
  id: string;
  userMessage?: UserMessageData;
  assistantMessage?: AssistantMessageData;
  assistantStage?: AssistantStageData;
  toolActivity: TimelineEvent[];
  diffPreviews: DiffPreviewData[];
  systemNotices: SystemNoticeData[];
  createdAt: Date;
  completed: boolean;
}

export class UnifiedTimelineRenderer {
  private layout: LayoutElements;
  private timelineRenderer: any; // TimelineRenderer instance
  private debugMode: boolean;

  // Enforcement state
  private static instance: UnifiedTimelineRenderer | null = null;
  private renderLockActive = true;

  // Performance optimization state
  private eventQueue: TimelineEvent[] = [];
  private processingQueue = false;
  private lastRenderTime = 0;
  private readonly RENDER_THROTTLE_MS = 100;

  // Deduplication state
  private eventCache = new Map<string, { count: number; timestamp: number }>();
  private readonly CACHE_MAX_SIZE = 500;
  private readonly CACHE_TTL_MS = 5000;
  private readonly DEDUPLICATION_WINDOW_MS = 100;

  // Message grouping state
  private messageGroups: MessageGroup[] = [];
  private currentMessageGroup: MessageGroup | null = null;
  private messageIdCounter = 0;

  // Large content optimization
  private readonly LARGE_CONTENT_THRESHOLD = 50000; // 50KB
  private readonly LARGE_LINE_THRESHOLD = 1000;

  // Performance monitoring
  private renderCount = 0;
  private deduplicationHits = 0;
  private totalEventsProcessed = 0;

  constructor(layout: LayoutElements, debugMode = false) {
    this.layout = layout;
    this.debugMode = debugMode;
    this.timelineRenderer = null; // Will be initialized with layout
    this.renderLockActive = true;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UnifiedTimelineRenderer {
    if (!UnifiedTimelineRenderer.instance) {
      throw new Error('UnifiedTimelineRenderer not initialized');
    }
    return UnifiedTimelineRenderer.instance;
  }

  /**
   * Initialize the singleton instance
   */
  static initialize(layout: LayoutElements, debugMode = false): UnifiedTimelineRenderer {
    UnifiedTimelineRenderer.instance = new UnifiedTimelineRenderer(layout, debugMode);
    return UnifiedTimelineRenderer.instance;
  }

  /**
   * ENFORCED: All timeline events MUST go through this method
   */
  addEvent(event: TimelineEvent): void {
    this.totalEventsProcessed++;
    
    // Apply deduplication and throttling
    const processedEvent = this.deduplicateEvent(event);
    if (!processedEvent) {
      return;
    }

    // Add to queue for throttled processing
    this.eventQueue.push(processedEvent);
    this.scheduleRender();
  }

  /**
   * Event deduplication to prevent spam
   */
  private deduplicateEvent(event: TimelineEvent): TimelineEvent | null {
    const eventId = this.generateEventId(event);
    const now = Date.now();
    const cached = this.eventCache.get(eventId);

    // Check for recent duplicates
    if (cached && (now - Number(cached.timestamp)) < this.DEDUPLICATION_WINDOW_MS) {
      this.deduplicationHits++;
      this.eventCache.set(eventId, { 
        count: cached.count + 1, 
        timestamp: cached.timestamp 
      });
      return null;
    }

    // Clean old cache entries
    this.cleanCache();
    
    // Add to cache
    this.eventCache.set(eventId, { count: 1, timestamp: now });
    
    return event;
  }

  /**
   * Generate unique event ID for deduplication
   */
  private generateEventId(event: TimelineEvent): string {
    const baseData = {
      type: event.type,
      timestamp: event.timestamp
    };

    switch (event.type) {
      case 'tool_invocation':
        return `${event.type}:${(event.data as ToolInvocationData).toolCall.function.name}:${Math.floor(Number(event.timestamp) / this.DEDUPLICATION_WINDOW_MS)}`;
      
      case 'assistant_stage':
        return `${event.type}:${(event.data as AssistantStageData).stage}`;
      
      default:
        return `${event.type}:${JSON.stringify(baseData)}`;
    }
  }

  /**
   * Clean old cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.eventCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL_MS) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.eventCache.delete(key);
    }

    // Prevent cache from growing too large
    if (this.eventCache.size > this.CACHE_MAX_SIZE) {
      const entries = Array.from(this.eventCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.CACHE_MAX_SIZE);
      toRemove.forEach(([key]) => this.eventCache.delete(key));
    }
  }

  /**
   * Schedule render with throttling
   */
  private scheduleRender(): void {
    if (this.processingQueue) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;

    if (timeSinceLastRender >= this.RENDER_THROTTLE_MS) {
      this.processQueue();
    } else {
      setTimeout(() => this.processQueue(), this.RENDER_THROTTLE_MS - timeSinceLastRender);
    }
  }

  /**
   * Process the event queue
   */
  private processQueue(): void {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      this.processBatchEvents(events);
      this.render();
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process batch of events
   */
  private processBatchEvents(events: TimelineEvent[]): void {
    for (const event of events) {
      this.processEvent(event);
    }
  }

  /**
   * Process individual event
   */
  private processEvent(event: TimelineEvent): void {
    switch (event.type) {
      case 'user_message':
        this.handleUserMessage(event);
        break;
      
      case 'assistant_message':
        this.handleAssistantMessage(event);
        break;
      
      case 'assistant_stage':
        this.handleAssistantStage(event);
        break;
      
      case 'tool_invocation':
        this.handleToolInvocation(event);
        break;
      
      case 'tool_result':
        this.handleToolResult(event);
        break;
      
      case 'diff_preview':
        this.handleDiffPreview(event);
        break;
      
      case 'system_notice':
        this.handleSystemNotice(event);
        break;
      
      default:
        if (this.debugMode) {
          console.log('Unknown event type:', event.type);
        }
    }
  }

  /**
   * Handle user message
   */
  private handleUserMessage(event: TimelineEvent): void {
    const data = event.data as UserMessageData;
    
    // Complete current group and start new one
    this.completeCurrentGroup();
    
    this.currentMessageGroup = {
      id: `msg-${this.messageIdCounter++}`,
      userMessage: data,
      assistantMessage: undefined,
      assistantStage: undefined,
      toolActivity: [],
      diffPreviews: [],
      systemNotices: [],
      createdAt: new Date(event.timestamp),
      completed: false
    };

    this.messageGroups.push(this.currentMessageGroup);
  }

  /**
   * Handle assistant message
   */
  private handleAssistantMessage(event: TimelineEvent): void {
    const data = event.data as AssistantMessageData;
    
    if (!this.currentMessageGroup) {
      this.startNewGroup();
    }
    
    if (this.currentMessageGroup) {
      this.currentMessageGroup.assistantMessage = data;
    }
  }

  /**
   * Handle assistant stage
   */
  private handleAssistantStage(event: TimelineEvent): void {
    const data = event.data as AssistantStageData;
    
    if (!this.currentMessageGroup) {
      this.startNewGroup();
    }
    
    if (this.currentMessageGroup) {
      this.currentMessageGroup.assistantStage = data;
    }
  }

  /**
   * Handle tool invocation
   */
  private handleToolInvocation(event: TimelineEvent): void {
    if (!this.currentMessageGroup) {
      this.startNewGroup();
    }
    
    if (this.currentMessageGroup) {
      this.currentMessageGroup.toolActivity.push(event);
    }
  }

  /**
   * Handle tool result
   */
  private handleToolResult(event: TimelineEvent): void {
    if (!this.currentMessageGroup) {
      this.startNewGroup();
    }
    
    if (this.currentMessageGroup) {
      this.currentMessageGroup.toolActivity.push(event);
    }
  }

  /**
   * Handle diff preview
   */
  private handleDiffPreview(event: TimelineEvent): void {
    const data = event.data as DiffPreviewData;
    
    if (!this.currentMessageGroup) {
      this.startNewGroup();
    }
    
    if (this.currentMessageGroup) {
      this.currentMessageGroup.diffPreviews.push(data);
    }
  }

  /**
   * Handle system notice
   */
  private handleSystemNotice(event: TimelineEvent): void {
    const data = event.data as SystemNoticeData;
    
    if (!this.currentMessageGroup) {
      this.startNewGroup();
    }
    
    if (this.currentMessageGroup) {
      this.currentMessageGroup.systemNotices.push(data);
    }
  }

  /**
   * Start new message group
   */
  private startNewGroup(): void {
    this.currentMessageGroup = {
      id: `msg-${this.messageIdCounter++}`,
      userMessage: undefined,
      assistantMessage: undefined,
      assistantStage: undefined,
      toolActivity: [],
      diffPreviews: [],
      systemNotices: [],
      createdAt: new Date(),
      completed: false
    };

    this.messageGroups.push(this.currentMessageGroup);
  }

  /**
   * Complete current message group
   */
  private completeCurrentGroup(): void {
    if (this.currentMessageGroup) {
      this.currentMessageGroup.completed = true;
      this.currentMessageGroup = null;
    }
  }

  /**
   * Render all content to screen
   */
  private render(): void {
    this.renderCount++;
    this.lastRenderTime = Date.now();

    // Clear timeline box
    this.layout.timelineBox.setContent('');
    
    // Render all message groups
    for (const group of this.messageGroups) {
      this.renderMessageGroup(group);
    }
    
    // Render current group if exists
    if (this.currentMessageGroup) {
      this.renderMessageGroup(this.currentMessageGroup);
    }
    
    this.scrollToBottom();
  }

  /**
   * Render individual message group
   */
  private renderMessageGroup(group: MessageGroup): void {
    let groupContent = '';
    
    // Render user message
    if (group.userMessage) {
      groupContent += `│ {#00C7B7-fg}👤 User:{/}\n`;
      groupContent += `│ ${group.userMessage.content}\n`;
      groupContent += `│\n`;
    }

    // Render assistant stage
    if (group.assistantStage) {
      const stage = group.assistantStage;
      let statusText = '';
      if (stage.stage === 'preparing') {
        statusText = `BrewGrok is analyzing your request...`;
      } else if (stage.stage === 'responding') {
        statusText = `BrewGrok is crafting response...`;
      } else if (stage.stage === 'working') {
        statusText = `Executing: ${stage.description}...`;
      } else {
        statusText = stage.description;
      }
      
      groupContent += `│ {#FFD700-fg}${statusText}{/}\n`;
      groupContent += `│\n`;
    }

    // Render assistant message
    if (group.assistantMessage) {
      groupContent += `│ {#FFD700-fg}🧠 BrewGrok:{/}\n`;
      
      const message = group.assistantMessage.content;
      if (message.length > this.LARGE_CONTENT_THRESHOLD) {
        // Chunk large messages
        groupContent += this.chunkContent(message);
      } else {
        groupContent += `│ ${message}\n`;
      }
      groupContent += `│\n`;
    }

    // Render tool activity
    if (group.toolActivity.length > 0) {
      groupContent += this.renderToolActivity(group.toolActivity);
    }

    // Render diff previews
    if (group.diffPreviews.length > 0) {
      groupContent += this.renderDiffPreviews(group.diffPreviews);
    }

    // Render system notices
    if (group.systemNotices.length > 0) {
      groupContent += this.renderSystemNotices(group.systemNotices);
    }

    // Render separator
    groupContent += `│ {#666-fg}${'─'.repeat(60)}{/}\n`;

    this.layout.timelineBox.pushLine(groupContent);
  }

  /**
   * Render clean execution report instead of noisy tool calls
   */
  private renderToolActivity(toolActivity: TimelineEvent[]): string {
    // Only show execution report at the end, not individual tool calls
    // Tool calls are now handled through MutationPlan preview/execution

    // If there are tool results, show a summary report
    const results = toolActivity.filter(activity => activity.type === 'tool_result');
    if (results.length === 0) {
      return '';
    }

    let content = `│ {#FFD700-fg}Execution Report{/}\n`;

    for (const activity of results) {
      const data = activity.data as any;
      const status = data.success ? '✅' : '❌';
      const duration = data.duration ? ` (${data.duration}ms)` : '';

      if (data.toolCall) {
        const toolName = data.toolCall.function.name;
        let operation = '';

        if (toolName === 'bash') {
          const args = JSON.parse(data.toolCall.function.arguments || '{}');
          operation = `Ran: ${args.command}`;
        } else if (toolName === 'str_replace_editor' || toolName === 'edit_file') {
          const args = JSON.parse(data.toolCall.function.arguments || '{}');
          operation = `Edited: ${args.file_path}`;
        } else if (toolName === 'create_file') {
          const args = JSON.parse(data.toolCall.function.arguments || '{}');
          operation = `Created: ${args.file_path}`;
        } else {
          operation = `${toolName}`;
        }

        content += `│ ${status} ${operation}${duration}\n`;

        if (!data.success && data.error) {
          content += `│   {#FF6B6B-fg}Error: ${data.error}{/}\n`;
        }
      }
    }

    content += `│\n`;
    return content;
  }

  /**
   * Render diff previews
   */
  private renderDiffPreviews(diffPreviews: DiffPreviewData[]): string {
    let content = '';
    
    for (const diff of diffPreviews) {
      content += `│ {#FFD700-fg}📝 ${diff.filePath}{/}\n`;
      
      if (diff.diff) {
        if (this.shouldRenderSideBySide()) {
          content += this.renderSideBySideDiff([diff]);
        } else {
          content += this.renderStackedDiff(diff);
        }
      }
      
      content += `│\n`;
    }
    
    return content;
  }

  /**
   * Render system notices
   */
  private renderSystemNotices(notices: SystemNoticeData[]): string {
    let content = '';
    
    for (const notice of notices) {
      const color = notice.level === 'error' ? '#FF6B6B-fg' :
                   notice.level === 'warning' ? '#FFD700-fg' :
                   notice.level === 'info' ? '#2ECC71-fg' : '#3498DB-fg';
      
      content += `│ {${color}}ℹ️ ${notice.message}{/}\n`;
    }
    
    if (content) {
      content += `│\n`;
    }
    
    return content;
  }

  /**
   * Check if terminal width supports side-by-side diff
   */
  private shouldRenderSideBySide(): boolean {
    try {
      const width = this.layout.timelineBox.width || 80;
      return width >= 100; // Require minimum 100 chars for side-by-side
    } catch {
      return false; // Fallback to stacked if width detection fails
    }
  }

  /**
   * Render side-by-side diff layout
   */
  private renderSideBySideDiff(diffPreviews: DiffPreviewData[]): string {
    let diffContent = '';

    for (const diff of diffPreviews) {
      diffContent += `│  {#FFD700-fg}${diff.filePath}{/}\n`;

      if (diff.diff) {
        const lines = diff.diff.split('\n');
        const maxLines = Math.min(lines.length, 20); // Limit for performance

        // Prepare old and new lines
        const oldLines: string[] = [];
        const newLines: string[] = [];

        for (let i = 0; i < maxLines; i++) {
          const line = lines[i];
          if (line.startsWith('-')) {
            oldLines.push(line.substring(1)); // Remove the '-' prefix
            newLines.push(''); // Empty for alignment
          } else if (line.startsWith('+')) {
            oldLines.push(''); // Empty for alignment
            newLines.push(line.substring(1)); // Remove the '+' prefix
          } else {
            // Context line
            oldLines.push(line);
            newLines.push(line);
          }
        }

        // Calculate column width
        const maxLineLength = Math.max(
          ...oldLines.map(l => l.length),
          ...newLines.map(l => l.length)
        );
        const colWidth = Math.min(maxLineLength + 2, 40); // Max 40 chars per column

        // Headers
        const headerPadding = Math.max(0, colWidth - 6); // "OLD (-)" is 6 chars
        const headerPadLeft = Math.floor(headerPadding / 2);
        const headerPadRight = headerPadding - headerPadLeft;

        diffContent += `│  ┌${'─'.repeat(colWidth)}┐ ┌${'─'.repeat(colWidth)}┐\n`;
        diffContent += `│  │${' '.repeat(headerPadLeft)}{#FF6B6B-fg}OLD (-){/}${' '.repeat(headerPadRight)}│ │${' '.repeat(headerPadLeft)}{#00C7B7-fg}NEW (+){/}${' '.repeat(headerPadRight)}│\n`;
        diffContent += `│  ├${'─'.repeat(colWidth)}┤ ├${'─'.repeat(colWidth)}┤\n`;

        // Content lines
        const maxContentLines = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxContentLines; i++) {
          const oldLine = (oldLines[i] || '').padEnd(colWidth - 1);
          const newLine = (newLines[i] || '').padEnd(colWidth - 1);

          // Color the lines if they have content
          const oldDisplay = oldLine.trim() ? `{#FF6B6B-fg}${oldLine}{/}` : oldLine;
          const newDisplay = newLine.trim() ? `{#00C7B7-fg}${newLine}{/}` : newLine;

          diffContent += `│  │${oldDisplay}│ │${newDisplay}│\n`;
        }

        // Bottom border
        diffContent += `│  └${'─'.repeat(colWidth)}┘ └${'─'.repeat(colWidth)}┘\n`;

        if (lines.length > maxLines) {
          diffContent += `│   {#666-fg}... ${lines.length - maxLines} more lines{/}\n`;
        }
      }

      diffContent += `│\n`;
    }

    return diffContent;
  }

  /**
   * Render stacked diff layout
   */
  private renderStackedDiff(diff: DiffPreviewData): string {
    let content = '';
    
    if (diff.diff) {
      const lines = diff.diff.split('\n');
      for (const line of lines.slice(0, 20)) { // Limit to 20 lines for performance
        if (line.startsWith('+')) {
          content += `│   {#2ECC71-fg}${line}{/}\n`;
        } else if (line.startsWith('-')) {
          content += `│   {#FF6B6B-fg}${line}{/}\n`;
        } else {
          content += `│   ${line}\n`;
        }
      }
      
      if (lines.length > 20) {
        content += `│   {#666-fg}... ${lines.length - 20} more lines{/}\n`;
      }
    }
    
    return content;
  }

  /**
   * Chunk large content for performance
   */
  private chunkContent(content: string): string {
    const lines = content.split('\n');
    const maxLines = Math.min(this.LARGE_LINE_THRESHOLD, lines.length);
    
    let chunked = '';
    for (let i = 0; i < maxLines; i++) {
      chunked += `│ ${lines[i]}\n`;
    }
    
    if (lines.length > maxLines) {
      chunked += `│ {#666-fg}... ${lines.length - maxLines} more lines{/}\n`;
    }
    
    return chunked;
  }

  /**
   * Scroll to bottom of timeline
   */
  private scrollToBottom(): void {
    try {
      const scrollHeight = this.layout.timelineBox.getScrollHeight();
      this.layout.timelineBox.setScroll(scrollHeight);
    } catch (error) {
      // Ignore scroll errors
    }
  }

  /**
   * Render MutationPlan preview before confirmation
   */
  renderMutationPlan(plan: MutationPlan): void {
    let content = '';

    // Header
    content += `│ {#FFD700-fg}📋 Ready to apply changes{/}\n`;
    content += `│ {#666-fg}Plan: ${plan.id}{/}\n`;
    if (plan.summary) {
      content += `│ {#666-fg}${plan.summary}{/}\n`;
    }
    content += `│\n`;

    // Items
    const maxVisible = 6;
    const itemsToShow = plan.items.slice(0, maxVisible);

    for (let i = 0; i < itemsToShow.length; i++) {
      const item = itemsToShow[i];
      const riskColor = item.risk === 'HIGH' ? '#FF6B6B-fg' :
                       item.risk === 'MED' ? '#FFD700-fg' : '#2ECC71-fg';
      const riskIcon = item.risk === 'HIGH' ? '🔴' :
                      item.risk === 'MED' ? '🟡' : '🟢';

      content += `│ {#FFD700-fg}${i + 1}.{/} ${item.label}\n`;
      content += `│   {#666-fg}Target:{/} ${item.target}\n`;
      content += `│   {#666-fg}Risk:{/} {${riskColor}}${riskIcon} ${item.risk}{/}\n`;

      // Show preview
      if (item.type === 'WRITE_FILE' || item.type === 'PATCH_FILE') {
        content += `│   {#666-fg}Preview:{/}\n`;
        if (item.preview) {
          const previewLines = item.preview.split('\n').slice(0, 5);
          for (const line of previewLines) {
            content += `│     ${line}\n`;
          }
        }
      } else if (item.type === 'RUN_BASH') {
        content += `│   {#666-fg}Command:{/} ${item.preview}\n`;
        if (item.workingDirectory) {
          content += `│   {#666-fg}Directory:{/} ${item.workingDirectory}\n`;
        }
      }

      content += `│\n`;
    }

    // Show count if more than maxVisible
    if (plan.items.length > maxVisible) {
      content += `│ {#666-fg}+ ${plan.items.length - maxVisible} more items...{/}\n`;
    }

    // Actions
    content += `│\n`;
    content += `│ {#FFD700-fg}Actions:{/}\n`;
    content += `│   {#2ECC71-fg}[Y] Apply{/}  {#FF6B6B-fg}[N] Cancel{/}  {#FFD700-fg}[A] Apply all{/}  {#666-fg}[V] View details{/}  {#666-fg}[D] Diff view{/}  {#666-fg}[Esc] Cancel{/}\n`;
    content += `│\n`;

    this.layout.timelineBox.pushLine(content);
    this.scrollToBottom();
  }

  /**
   * Clear all content
   */
  clearAll(): void {
    this.messageGroups = [];
    this.currentMessageGroup = null;
    this.eventQueue = [];
    this.eventCache.clear();
    this.render();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      totalEventsProcessed: this.totalEventsProcessed,
      deduplicationHits: this.deduplicationHits,
      renderCount: this.renderCount,
      cacheSize: this.eventCache.size,
      queueSize: this.eventQueue.length
    };
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Enforce render lock to prevent direct rendering
   */
  static enforceRenderLock(): void {
    // Legacy method for compatibility
  }

  /**
   * Handle tab key press
   */
  handleTabKey(): void {
    // Legacy method for compatibility
  }

  /**
   * Clear all content (alias for clearAll)
   */
  clear(): void {
    this.clearAll();
  }
}

// Export function to prevent direct rendering (for compatibility)
export function preventDirectRendering(): void {
  // Legacy function for compatibility
}

// Export function to emit events (for backward compatibility)
export function emitEvent(type: TimelineEventType, data: any): void {
  try {
    const renderer = UnifiedTimelineRenderer.getInstance();
    renderer.addEvent({
      id: `event-${Date.now()}`,
      type,
      data,
      timestamp: new Date(Date.now())
    });
  } catch (error) {
    // Renderer not initialized - ignore silently
    if (process.env.GROK_DEBUG) {
      console.log('UnifiedTimelineRenderer not initialized, ignoring event:', type);
    }
  }
}