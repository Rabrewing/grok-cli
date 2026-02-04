import React from "react";
import { Box, Text } from "ink";
import { ChatEntry } from "../../agent/grok-agent.js";
import { TimelineRenderer, TimelineEventGroup } from "../timeline-renderer.js";
import { DiffRenderer } from "./diff-renderer.js";
import { MarkdownRenderer } from "../utils/markdown-renderer.js";

// Helper function to strip formatting tokens
const stripFormatting = (content: string): string => {
  return content
    .replace(/\{[^}]+\}/g, '') // Remove {color} tags
    .replace(/\[.*?\]/g, '')   // Remove [style] tags
    .replace(/\\u001b\[[0-9;]*m/g, '') // Remove ANSI escape codes
    .trim();
};

interface ChatHistoryProps {
  timelineRenderer: TimelineRenderer;
  isConfirmationActive?: boolean;
  isStreaming?: boolean;
}

// Render window cap to prevent excessive re-renders
const MAX_ENTRIES_RENDERED = 25;
const MAX_ENTRIES_DURING_STREAMING = 10; // Reduce during streaming for better performance

// Memoized ChatEntry component to prevent unnecessary re-renders
const MemoizedChatEntry = React.memo(
  ({ entry, index }: { entry: ChatEntry; index: number }) => {
    const renderDiff = (diffContent: string, filename?: string) => {
      return (
        <DiffRenderer
          diffContent={diffContent}
          filename={filename}
          terminalWidth={80}
        />
      );
    };

    const renderFileContent = (content: string) => {
      const lines = content.split("\n");

      // Calculate minimum indentation like DiffRenderer does
      let baseIndentation = Infinity;
      for (const line of lines) {
        if (line.trim() === "") continue;
        const firstCharIndex = line.search(/\S/);
        const currentIndent = firstCharIndex === -1 ? 0 : firstCharIndex;
        baseIndentation = Math.min(baseIndentation, currentIndent);
      }
      if (!isFinite(baseIndentation)) {
        baseIndentation = 0;
      }

      return lines.map((line, index) => {
        const displayContent = line.substring(baseIndentation);
        return (
          <Text key={index} color="gray">
            {displayContent}
          </Text>
        );
      });
    };

    switch (entry.type) {
      case "user":
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box>
              <Text color="gray">
                {">"} {entry.content}
              </Text>
            </Box>
          </Box>
        );

      case "assistant":
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box flexDirection="row" alignItems="flex-start">
              <Text color="white">⏺ </Text>
              <Box flexDirection="column" flexGrow={1}>
                {entry.toolCalls ? (
                  // If there are tool calls, just show plain text
                  <Text color="white">{entry.content.trim()}</Text>
                ) : (
                  // If no tool calls, render as markdown
                  <MarkdownRenderer content={entry.content.trim()} />
                )}
                {entry.isStreaming && <Text color="cyan">█</Text>}
              </Box>
            </Box>
          </Box>
        );

      case "tool_call":
      case "tool_result":
        const getToolActionName = (toolName: string) => {
          // Handle MCP tools with mcp__servername__toolname format
          if (toolName.startsWith("mcp__")) {
            const parts = toolName.split("__");
            if (parts.length >= 3) {
              const serverName = parts[1];
              const actualToolName = parts.slice(2).join("__");
              return `${serverName.charAt(0).toUpperCase() + serverName.slice(1)}(${actualToolName.replace(/_/g, " ")})`;
            }
          }

          switch (toolName) {
            case "view_file":
              return "Read";
            case "str_replace_editor":
              return "Update";
            case "create_file":
              return "Create";
            case "bash":
              return "Bash";
            case "search":
              return "Search";
            case "create_todo_list":
              return "Created Todo";
            case "update_todo_list":
              return "Updated Todo";
            default:
              return "Tool";
          }
        };

        const toolName = entry.toolCall?.function?.name || "unknown";
        const actionName = getToolActionName(toolName);

        const getFilePath = (toolCall: any) => {
          if (toolCall?.function?.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              if (toolCall.function.name === "search") {
                return args.query;
              }
              return args.path || args.file_path || args.command || "";
            } catch {
              return "";
            }
          }
          return "";
        };

        const filePath = getFilePath(entry.toolCall);
        const isExecuting = entry.type === "tool_call" || !entry.toolResult;
        
        // Format JSON content for better readability
        const formatToolContent = (content: string, toolName: string) => {
          if (toolName.startsWith("mcp__")) {
            try {
              // Try to parse as JSON and format it
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) {
                // For arrays, show a summary instead of full JSON
                return `Found ${parsed.length} items`;
              } else if (typeof parsed === 'object') {
                // For objects, show a formatted version
                return JSON.stringify(parsed, null, 2);
              }
            } catch {
              // If not JSON, return as is
              return content;
            }
          }
          return content;
        };
        const shouldShowDiff =
          entry.toolCall?.function?.name === "str_replace_editor" &&
          entry.toolResult?.success &&
          entry.content.includes("Updated") &&
          entry.content.includes("---") &&
          entry.content.includes("+++");

        const shouldShowFileContent =
          (entry.toolCall?.function?.name === "view_file" ||
            entry.toolCall?.function?.name === "create_file") &&
          entry.toolResult?.success &&
          !shouldShowDiff;

        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box>
              <Text color="magenta">⏺</Text>
              <Text color="white">
                {" "}
                {filePath ? `${actionName}(${filePath})` : actionName}
              </Text>
            </Box>
            <Box marginLeft={2} flexDirection="column">
              {isExecuting ? (
                <Text color="cyan">⎿ Executing...</Text>
              ) : shouldShowFileContent ? (
                <Box flexDirection="column">
                  <Text color="gray">⎿ File contents:</Text>
                  <Box marginLeft={2} flexDirection="column">
                    {renderFileContent(entry.content)}
                  </Box>
                </Box>
              ) : shouldShowDiff ? (
                // For diff results, show only the summary line, not the raw content
                <Text color="gray">⎿ {entry.content.split("\n")[0]}</Text>
              ) : (
                <Text color="gray">⎿ {formatToolContent(entry.content, toolName)}</Text>
              )}
            </Box>
              {shouldShowDiff && !isExecuting && entry.content && (
                <Box marginLeft={4} flexDirection="column">
                  {renderDiff(entry.content, filePath)}
                </Box>
              )}
          </Box>
        );

      default:
        return null;
    }
  }
);

MemoizedChatEntry.displayName = "MemoizedChatEntry";

// Component to render a single timeline group
function TimelineGroup({
  group,
  isConfirmationActive,
}: {
  group: TimelineEventGroup;
  isConfirmationActive: boolean;
}) {
  const userData = group.userMessage.data as any;
  const hasAssistantContent = group.assistantStage || group.toolActivity.length > 0 || group.results.length > 0;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* User Message */}
      <Box flexDirection="column">
        <Text color="#00C7B7">┌─ User</Text>
        <Text color="#00C7B7">│  {userData.content}</Text>
        <Text color="#00C7B7">└──────────────────────────</Text>
      </Box>

      {/* Assistant Section */}
      {hasAssistantContent && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="#FFD700">┌─ BrewGrok</Text>

          {/* Assistant Stage */}
          {group.assistantStage && (
            <Text color="#FFD700">
              │  {(group.assistantStage.data as any).description}
            </Text>
          )}

          {/* Tool Activity */}
          {group.toolActivity.length > 0 && (
            <>
              <Text color="#FFD700">│</Text>
              {group.toolActivity.map((toolEvent, index) => (
                <ToolActivityItem
                  key={toolEvent.id}
                  toolEvent={toolEvent}
                />
              ))}
            </>
          )}

          {/* Diff Preview */}
          {group.diffPreviews.length > 0 && (
            <>
              <Text color="#FFD700">│</Text>
              {group.diffPreviews.map((diffEvent, index) => (
                <DiffPreviewItem
                  key={diffEvent.id}
                  diffEvent={diffEvent}
                />
              ))}
            </>
          )}

          {/* System Notices */}
          {group.systemNotices.length > 0 && (
            <>
              <Text color="#FFD700">│</Text>
              {group.systemNotices.map((notice, index) => (
                <SystemNoticeItem
                  key={notice.id}
                  notice={notice}
                />
              ))}
            </>
          )}

          {/* Results */}
          {group.results.length > 0 && (
            <>
              <Text color="#FFD700">│</Text>
              <Text color="#FFD700">
                │  {(group.results[0].data as any).content}
              </Text>
            </>
          )}

          <Text color="#FFD700">└──────────────────────────</Text>
        </Box>
      )}
    </Box>
  );
}

// Component to render individual tool activity
function ToolActivityItem({
  toolEvent,
}: {
  toolEvent: any;
}) {
  const invocationData = toolEvent.data as any;
  const resultEvent = toolEvent; // For now, assume it's combined

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00C7B7';
      case 'failed': return 'red';
      case 'running': return 'yellow';
      default: return 'gray';
    }
  };

  const status = invocationData.status || (invocationData.success !== undefined ? (invocationData.success ? 'completed' : 'failed') : 'running');
  const duration = invocationData.duration ? `${invocationData.duration}ms` : '';
  const toolName = invocationData.toolCall?.function?.name || 'unknown';

  return (
    <Box flexDirection="column">
      <Text color="#FFD700">
        │  Tool: {toolName}     Status: {status}     {duration && `Duration: ${duration}`}
      </Text>

      {/* Command executed */}
      {invocationData.toolCall?.function?.arguments && (
        <Text color="#FFD700">
          │     Command: {JSON.parse(invocationData.toolCall.function.arguments).command}
        </Text>
      )}

      {/* Exit code */}
      {invocationData.success !== undefined && (
        <Text color="#FFD700">
          │     Exit Code: {invocationData.success ? 0 : 1}
        </Text>
      )}

      {/* Stdout/Stderr */}
      {invocationData.output && (
        <Box flexDirection="column">
          <Text color="#FFD700">│     Output:</Text>
          <Text color="gray">
            │       {stripFormatting(invocationData.output).split('\n').slice(0, 5).join('\n│       ')}
            {stripFormatting(invocationData.output).split('\n').length > 5 && '\n│       ...'}
          </Text>
        </Box>
      )}

      {invocationData.error && (
        <Box flexDirection="column">
          <Text color="#FFD700">│     Error:</Text>
          <Text color="red">
            │       {stripFormatting(invocationData.error).split('\n').slice(0, 3).join('\n│       ')}
            {stripFormatting(invocationData.error).split('\n').length > 3 && '\n│       ...'}
          </Text>
        </Box>
      )}

      {/* Files affected */}
      {invocationData.filesAffected && invocationData.filesAffected.length > 0 && (
        <Text color="#FFD700">
          │     Files: {invocationData.filesAffected.join(', ')}
        </Text>
      )}
    </Box>
  );
}

// Component to render individual diff preview
function DiffPreviewItem({
  diffEvent,
}: {
  diffEvent: any;
}) {
  const diffData = diffEvent.data as any;
  const filePath = diffData.filePath;
  const changes = diffData.changes;

  return (
    <Box flexDirection="column">
      <Text color="#FFD700">
        │  File modified: {filePath} +{changes.added} -{changes.removed}
      </Text>

      {diffData.diff && (
        <Box flexDirection="column">
          <Text color="#FFD700">│     Changes:</Text>
          <Text color="gray">
            │       {diffData.diff.split('\n').slice(0, 10).join('\n│       ')}
            {diffData.diff.split('\n').length > 10 && '\n│       ...'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Component to render system notices
function SystemNoticeItem({
  notice,
}: {
  notice: any;
}) {
  const noticeData = notice.data as any;
  const level = noticeData.level;
  const message = noticeData.message;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return '#00C7B7';
      default: return 'gray';
    }
  };

  return (
    <Box flexDirection="column">
      <Text color={getLevelColor(level)}>
        │  System: {message}
      </Text>
    </Box>
  );
}

export function ChatHistory({
  timelineRenderer,
  isConfirmationActive = false,
  isStreaming = false,
}: ChatHistoryProps) {
  const groups = timelineRenderer.getEventGroups();

  // Apply render windowing - use reduced limit during streaming for better performance
  const maxGroups = isStreaming ? 5 : 10;
  const visibleGroups = groups.slice(-maxGroups);

  return (
    <Box flexDirection="column">
      {visibleGroups.map((group) => (
        <TimelineGroup
          key={group.id}
          group={group}
          isConfirmationActive={isConfirmationActive}
        />
      ))}
    </Box>
  );
}
