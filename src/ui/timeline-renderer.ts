/**
 * Unified Timeline Renderer - Single Source of Truth for BrewGrok TUI
 *
 * This renderer handles all output normalization, styling, grouping, collapsing,
 * and deduplication. No component should print directly to screen.
 */

export type TimelineEventType =
  | 'user_message'
  | 'assistant_message'
  | 'assistant_stage'
  | 'tool_invocation'
  | 'tool_result'
  | 'diff_preview'
  | 'system_notice';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: Date;
  data: any;
}

export interface UserMessageData {
  content: string;
}

export interface AssistantMessageData {
  content: string;
  toolCalls?: any[];
}

export interface AssistantStageData {
  stage: string;
  description: string;
}

export interface ToolInvocationData {
  toolCall: any;
  startTime: Date;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
}

export interface ToolResultData {
  toolCall: any;
  success: boolean;
  output?: string;
  error?: string;
  filesAffected?: string[];
  duration: number;
}

export interface DiffPreviewData {
  filePath: string;
  changes: {
    added: number;
    removed: number;
  };
  diff?: string;
  sideBySide?: boolean;
}

export interface SystemNoticeData {
  level: 'info' | 'warning' | 'error';
  message: string;
}

export class TimelineRenderer {
  private events: TimelineEvent[] = [];
  private eventGroups: TimelineEventGroup[] = [];
  private debugMode = false;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  /**
   * Add an event to the timeline
   */
  addEvent(event: TimelineEvent): void {
    // Check for duplicates and merge/update if needed
    const existingIndex = this.events.findIndex(e =>
      e.type === event.type &&
      this.eventsAreEqual(e, event)
    );

    if (existingIndex !== -1) {
      // Update existing event instead of adding duplicate
      this.events[existingIndex] = { ...event, id: this.events[existingIndex].id };
    } else {
      this.events.push(event);
    }

    this.updateGroups();
  }

  /**
   * Check if two events are considered equal for deduplication
   */
  private eventsAreEqual(event1: TimelineEvent, event2: TimelineEvent): boolean {
    if (event1.type !== event2.type) return false;

    switch (event1.type) {
      case 'tool_result':
        const data1 = event1.data as ToolResultData;
        const data2 = event2.data as ToolResultData;
        return data1.toolCall?.id === data2.toolCall?.id;

      case 'assistant_message':
        const msg1 = event1.data as AssistantMessageData;
        const msg2 = event2.data as AssistantMessageData;
        return msg1.content === msg2.content;

      case 'diff_preview':
        const diff1 = event1.data as DiffPreviewData;
        const diff2 = event2.data as DiffPreviewData;
        return diff1.filePath === diff2.filePath &&
               diff1.changes.added === diff2.changes.added &&
               diff1.changes.removed === diff2.changes.removed;

      default:
        return false;
    }
  }

  /**
   * Get current event groups for rendering
   */
  getEventGroups(): TimelineEventGroup[] {
    return this.eventGroups;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.eventGroups = [];
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Group events into logical units (one per user action)
   */
  private updateGroups(): void {
    const groups: TimelineEventGroup[] = [];
    let currentGroup: TimelineEventGroup | null = null;

    for (const event of this.events) {
      if (event.type === 'user_message') {
        // Start new group
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          id: `group_${event.id}`,
          userMessage: event,
          assistantStage: null,
          toolActivity: [],
          diffPreviews: [],
          results: [],
          systemNotices: [],
          completed: false,
        };
      } else if (currentGroup) {
        // Add to current group
        switch (event.type) {
          case 'assistant_stage':
            currentGroup.assistantStage = event;
            break;
          case 'tool_invocation':
          case 'tool_result':
            currentGroup.toolActivity.push(event);
            break;
          case 'diff_preview':
            currentGroup.diffPreviews.push(event);
            break;
          case 'system_notice':
            currentGroup.systemNotices.push(event);
            break;
          case 'assistant_message':
            currentGroup.results.push(event);
            break;
        }
      }
    }

    if (currentGroup) {
      groups.push(currentGroup);
    }

    this.eventGroups = groups;
  }

  /**
   * Render the timeline to styled output
   */
  render(): string {
    const output: string[] = [];

    if (this.debugMode) {
      output.push('🔧 DEBUG MODE ENABLED');
      output.push(`Total events: ${this.events.length}`);
      output.push(`Event groups: ${this.eventGroups.length}`);
      output.push('');
    }

    for (const group of this.eventGroups) {
      output.push(this.renderGroup(group));
      output.push(''); // Empty line between groups
    }

    return output.join('\n');
  }

  /**
   * Render a single event group
   */
  private renderGroup(group: TimelineEventGroup): string {
    const lines: string[] = [];

    if (this.debugMode) {
      lines.push(`🔍 Group ID: ${group.id}`);
      lines.push(`   Events: ${group.userMessage ? 1 : 0} user + ${group.assistantStage ? 1 : 0} stage + ${group.toolActivity.length} tools + ${group.diffPreviews.length} diffs + ${group.results.length} results + ${group.systemNotices.length} notices`);
      lines.push('');
    }

    // User message (always shown)
    const userData = group.userMessage.data as UserMessageData;
    lines.push(`┌─ User`);
    if (this.debugMode) {
      lines.push(`│  [${group.userMessage.id}] ${userData.content}`);
    } else {
      lines.push(`│  ${userData.content}`);
    }
    lines.push(`└──────────────────────────`);

    // Assistant section
    if (group.assistantStage || group.toolActivity.length > 0 || group.results.length > 0) {
      lines.push(`┌─ BrewGrok`);

      // Assistant stage (if present)
      if (group.assistantStage) {
        const stageData = group.assistantStage.data as AssistantStageData;
        if (this.debugMode) {
          lines.push(`│  [${group.assistantStage.id}] ${stageData.description}`);
        } else {
          lines.push(`│  ${stageData.description}`);
        }
      }

      // Tool activity (collapsed by default)
      if (group.toolActivity.length > 0) {
        lines.push(`│`);
        lines.push(`│  ▸ Tool Activity (${group.toolActivity.length} operations)`);
        if (this.debugMode) {
          for (const tool of group.toolActivity) {
            const toolData = tool.data as ToolInvocationData;
            lines.push(`│     [${tool.id}] ${toolData.toolCall?.function?.name} -> ${toolData.status}`);
          }
        }
      }

      // Diff previews (collapsed by default)
      if (group.diffPreviews.length > 0) {
        lines.push(`│  ▸ Diff Preview (${group.diffPreviews.length} files changed)`);
        if (this.debugMode) {
          for (const diff of group.diffPreviews) {
            const diffData = diff.data as DiffPreviewData;
            lines.push(`│     [${diff.id}] ${diffData.filePath}: +${diffData.changes.added} -${diffData.changes.removed}`);
          }
        }
      }

      // System notices
      if (group.systemNotices.length > 0) {
        lines.push(`│`);
        for (const notice of group.systemNotices) {
          const noticeData = notice.data as SystemNoticeData;
          const levelEmoji = noticeData.level === 'error' ? '❌' : noticeData.level === 'warning' ? '⚠️' : 'ℹ️';
          lines.push(`│  ${levelEmoji} ${noticeData.message}`);
        }
      }

      // Results (collapsed by default)
      if (group.results.length > 0) {
        const result = group.results[0]; // For now, take first result
        const resultData = result.data as AssistantMessageData;
        lines.push(`│`);
        if (this.debugMode) {
          lines.push(`│  [${result.id}] ${this.stripFormatting(resultData.content)}`);
        } else {
          lines.push(`│  ${this.stripFormatting(resultData.content)}`);
        }
      }

      lines.push(`└──────────────────────────`);
    }

    return lines.join('\n');
  }

  /**
   * Strip raw formatting tokens from content
   */
  private stripFormatting(content: string): string {
    // Remove blessed formatting tags
    return content
      .replace(/\{[^}]+\}/g, '') // Remove {color} tags
      .replace(/\[.*?\]/g, '')   // Remove [style] tags
      .replace(/\\u001b\[[0-9;]*m/g, '') // Remove ANSI escape codes
      .trim();
  }

  /**
   * Convert legacy ChatEntry to TimelineEvent
   */
  static fromChatEntry(entry: any): TimelineEvent {
    const baseEvent = {
      id: `event_${Date.now()}_${Math.random()}`,
      timestamp: entry.timestamp,
    };

    switch (entry.type) {
      case 'user':
        return {
          ...baseEvent,
          type: 'user_message',
          data: { content: entry.content } as UserMessageData,
        };

      case 'assistant':
        return {
          ...baseEvent,
          type: 'assistant_message',
          data: {
            content: entry.content,
            toolCalls: entry.toolCalls,
          } as AssistantMessageData,
        };

      case 'tool_call':
        return {
          ...baseEvent,
          type: 'tool_invocation',
          data: {
            toolCall: entry.toolCall,
            startTime: entry.timestamp,
            status: 'running',
          } as ToolInvocationData,
        };

      case 'tool_result':
        return {
          ...baseEvent,
          type: 'tool_result',
          data: {
            toolCall: entry.toolCall,
            success: entry.toolResult?.success || false,
            output: entry.toolResult?.output,
            error: entry.toolResult?.error,
            duration: 0, // TODO: Calculate duration
          } as ToolResultData,
        };

      default:
        return {
          ...baseEvent,
          type: 'system_notice',
          data: {
            level: 'info',
            message: `Unknown event type: ${entry.type}`,
          } as SystemNoticeData,
        };
    }
  }

  /**
   * Create a diff preview event for file changes
   */
  static createDiffEvent(filePath: string, changes: { added: number; removed: number }, diff?: string): TimelineEvent {
    return {
      id: `diff_${Date.now()}_${Math.random()}`,
      type: 'diff_preview',
      timestamp: new Date(),
      data: {
        filePath,
        changes,
        diff,
        sideBySide: false,
      } as DiffPreviewData,
    };
  }

  /**
   * Create an assistant stage event
   */
  static createAssistantStage(stage: string, description: string): TimelineEvent {
    return {
      id: `stage_${Date.now()}_${Math.random()}`,
      type: 'assistant_stage',
      timestamp: new Date(),
      data: {
        stage,
        description,
      } as AssistantStageData,
    };
  }

  /**
   * Create a system notice event
   */
  static createSystemNotice(level: 'info' | 'warning' | 'error', message: string): TimelineEvent {
    return {
      id: `notice_${Date.now()}_${Math.random()}`,
      type: 'system_notice',
      timestamp: new Date(),
      data: {
        level,
        message,
      } as SystemNoticeData,
    };
  }
}

export interface TimelineEventGroup {
  id: string;
  userMessage: TimelineEvent;
  assistantStage: TimelineEvent | null;
  toolActivity: TimelineEvent[];
  diffPreviews: TimelineEvent[];
  results: TimelineEvent[];
  systemNotices: TimelineEvent[];
  completed: boolean;
}