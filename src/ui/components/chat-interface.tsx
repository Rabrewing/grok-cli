import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useCallback } from 'react';
import { Box, Text, Static } from 'ink';
import { GrokAgent, ChatEntry } from '../../agent/grok-agent.js';
import { useInputHandler } from '../../hooks/use-input-handler.js';
import { LoadingSpinner } from './loading-spinner.js';
import { CommandSuggestions } from './command-suggestions.js';
import { ModelSelection } from './model-selection.js';
import { ChatHistory } from './chat-history.js';
import { ChatInput } from './chat-input.js';
import { MCPStatus } from './mcp-status.js';
import ConfirmationDialog from './confirmation-dialog.js';
import {
  ConfirmationService,
  ConfirmationOptions,
} from '../../utils/confirmation-service.js';
import ApiKeyInput from './api-key-input.js';
import { streamWriter } from '../stream-writer.js';
import { TimelineRenderer } from '../timeline-renderer.js';
import cfonts from 'cfonts';

interface ChatInterfaceProps {
  agent?: GrokAgent;
  initialMessage?: string;
  applyMode?: boolean;
  diffMode?: boolean;
  fullFileMode?: boolean;
  repoMode?: boolean;
  repoSnapshot?: string;
  debugUi?: boolean;
}

// Main chat component that handles input when agent is available
function ChatInterfaceWithAgent({
  agent,
  initialMessage,
  applyMode = false,
  diffMode = true,
  fullFileMode = false,
  repoMode = false,
  repoSnapshot = '',
  debugUi = false,
}: {
  agent: GrokAgent;
  initialMessage?: string;
  applyMode?: boolean;
  diffMode?: boolean;
  fullFileMode?: boolean;
  repoMode?: boolean;
  repoSnapshot?: string;
  debugUi?: boolean;
}) {
  // Add streaming buffer to reduce React state updates

  
  const [timelineRenderer] = useState(() => new TimelineRenderer(debugUi));
  const [chatHistory, setChatHistoryState] = useState<ChatEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamFrozenHistory, setStreamFrozenHistory] = useState<ChatEntry[]>([]);
  const [confirmationOptions, setConfirmationOptions] =
    useState<ConfirmationOptions | null>(null);
  const scrollRef = useRef<any>();
  const processingStartTime = useRef<number>(0);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const confirmationService = ConfirmationService.getInstance();

  // Render counter to detect flicker-causing re-renders
  const [renderCount, setRenderCount] = useState(0);
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  // Wrapper for setChatHistory that also updates timeline renderer
  const setChatHistory = useCallback((updater: ChatEntry[] | ((prev: ChatEntry[]) => ChatEntry[])) => {
    setChatHistoryState((prev) => {
      const newHistory = typeof updater === 'function' ? updater(prev) : updater;

      // Add new entries to timeline renderer
      const prevIds = new Set(prev.map(entry => `${entry.type}_${entry.timestamp.getTime()}_${entry.content}`));
      for (const entry of newHistory) {
        const entryId = `${entry.type}_${entry.timestamp.getTime()}_${entry.content}`;
        if (!prevIds.has(entryId)) {
          const timelineEvent = TimelineRenderer.fromChatEntry(entry);
          timelineRenderer.addEvent(timelineEvent);

          // Check if this is a tool result that indicates file changes
          if (entry.type === 'tool_result' && entry.toolResult?.success && entry.toolCall) {
            const toolName = entry.toolCall.function.name;
            if (toolName === 'str_replace_editor' || toolName === 'create_file') {
              // Parse the diff from the output
              const output = entry.toolResult.output || '';
              const filePath = extractFilePathFromToolCall(entry.toolCall);

              if (filePath && output.includes('@@')) {
                // This looks like a diff, create a diff event
                const changes = extractChangesFromDiff(output);
                const diffEvent = TimelineRenderer.createDiffEvent(filePath, changes, output);
                timelineRenderer.addEvent(diffEvent);
              }
            }
          }
        }
      }

      return newHistory;
    });
  }, [timelineRenderer]);

  // Helper functions for diff event creation
  const extractFilePathFromToolCall = (toolCall: any): string | null => {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      return args.path || null;
    } catch {
      return null;
    }
  };

  const extractChangesFromDiff = (diffOutput: string): { added: number; removed: number } => {
    const lines = diffOutput.split('\n');
    let added = 0;
    let removed = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removed++;
      }
    }

    return { added, removed };
  };

  // Show system notice for inactivity
  const showInactivityNotice = useCallback(() => {
    const systemNotice = TimelineRenderer.createSystemNotice('warning', 'No activity detected for 30 seconds. Request may have stalled.');
    timelineRenderer.addEvent(systemNotice);
  }, [timelineRenderer]);

  // Clear inactivity timeout
  const clearInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  // Set inactivity timeout
  const setInactivityTimeout = useCallback(() => {
    clearInactivityTimeout();
    inactivityTimeoutRef.current = setTimeout(showInactivityNotice, 30000); // 30 seconds
  }, [clearInactivityTimeout, showInactivityNotice]);

  const {
    input,
    cursorPosition,
    showCommandSuggestions,
    selectedCommandIndex,
    showModelSelection,
    selectedModelIndex,
    commandSuggestions,
    availableModels,
    autoEditEnabled,
  } = useInputHandler({
    agent,
    chatHistory,
    setChatHistory,
    setIsProcessing,
    setIsStreaming,
    setTokenCount,
    setProcessingTime,
    processingStartTime,
    isProcessing,
    isStreaming,
    isConfirmationActive: !!confirmationOptions,
  });

  useEffect(() => {
    setChatHistory([]);
  }, []);

  // Process initial message if provided (streaming for faster feedback)
  useEffect(() => {
    if (initialMessage && agent) {
      const userEntry: ChatEntry = {
        type: 'user',
        content: initialMessage,
        timestamp: new Date(),
      };
      setChatHistory([userEntry]);

      const processInitialMessage = async () => {
        // In headless mode (initial message provided), auto-approve all confirmations
        confirmationService.setSessionFlag('allOperations', true);

        setIsProcessing(true);
        setIsStreaming(true);

        try {
          // Use Hybrid Renderer for initial message
          let sessionId: string | null = null;
          let finalText = '';
          let toolCalls: any[] = [];
          let hasToolCalls = false;

          for await (const chunk of agent.processUserMessageStream(
            initialMessage
          )) {
            switch (chunk.type) {
              case 'content':
                if (chunk.content) {
                  if (!sessionId) {
                    sessionId = streamWriter.beginAssistantStream();
                  }
                  streamWriter.writeChunk(chunk.content);
                  finalText += chunk.content;
                }
                break;
              case 'token_count':
                if (chunk.tokenCount !== undefined) {
                  setTokenCount(chunk.tokenCount);
                }
                break;
              case 'tool_calls':
                if (chunk.toolCalls) {
                  hasToolCalls = true;
                  toolCalls = chunk.toolCalls;
                  
                  // End current assistant stream
                  if (sessionId) {
                    const result = streamWriter.endAssistantStream();
                    finalText = result.finalText;
                    sessionId = null;
                  }

                  // Add tool call entries to chat history
                  chunk.toolCalls.forEach((toolCall) => {
                    const toolCallEntry: ChatEntry = {
                      type: 'tool_call',
                      content: 'Executing...',
                      timestamp: new Date(),
                      toolCall: toolCall,
                    };
                    setChatHistory((prev) => [...prev, toolCallEntry]);
                  });
                }
                break;
              case 'tool_result':
                if (chunk.toolCall && chunk.toolResult) {
                  // Update the existing tool_call entry with the result
                  setChatHistory((prev) =>
                    prev.map((entry) => {
                      if (
                        entry.type === 'tool_call' &&
                        entry.toolCall?.id === chunk.toolCall?.id
                      ) {
                        return {
                          ...entry,
                          type: 'tool_result',
                          content: chunk.toolResult.success
                            ? chunk.toolResult.output || 'Success'
                            : chunk.toolResult.error || 'Error occurred',
                          toolResult: chunk.toolResult,
                        };
                      }
                      return entry;
                    })
                  );

                  // Resume streaming after tool result
                  if (hasToolCalls) {
                    sessionId = streamWriter.beginAssistantStream();
                    hasToolCalls = false;
                  }
                }
                break;
              case 'done':
                // End streaming and commit final message
                if (sessionId) {
                  const result = streamWriter.endAssistantStream();
                  finalText = result.finalText;
                  sessionId = null;
                }
                
                // Commit final assistant message to React state
                if (finalText) {
                  const assistantEntry: ChatEntry = {
                    type: 'assistant',
                    content: finalText,
                    timestamp: new Date(),
                    ...(toolCalls.length > 0 && { toolCalls }),
                  };
                  setChatHistory((prev) => [...prev, assistantEntry]);
                }
                
                setIsStreaming(false);
                break;
            }
          }
        } catch (error: any) {
          // Clean up stream on error
          if (streamWriter.isStreaming()) {
            streamWriter.abortStream();
          }
          
          const errorEntry: ChatEntry = {
            type: 'assistant',
            content: `Error: ${error.message}`,
            timestamp: new Date(),
          };
          setChatHistory((prev) => [...prev, errorEntry]);
          setIsStreaming(false);
        }

        setIsProcessing(false);
        processingStartTime.current = 0;
      };

      processInitialMessage();
    }
  }, [initialMessage, agent]);

  useEffect(() => {
    const handleConfirmationRequest = (options: ConfirmationOptions) => {
      setConfirmationOptions(options);
    };

    confirmationService.on('confirmation-requested', handleConfirmationRequest);

    return () => {
      confirmationService.off(
        'confirmation-requested',
        handleConfirmationRequest
      );
    };
  }, [confirmationService]);

  useEffect(() => {
    if (!isProcessing && !isStreaming) {
      setProcessingTime(0);
      // Unfreeze history when streaming ends
      setStreamFrozenHistory([]);
      // Clear inactivity timeout
      clearInactivityTimeout();
      return;
    }

    if (processingStartTime.current === 0) {
      processingStartTime.current = Date.now();
      // Set inactivity timeout when processing starts
      setInactivityTimeout();
    }

    // Freeze history when streaming starts to prevent repaints
    if (isStreaming && streamFrozenHistory.length === 0) {
      setStreamFrozenHistory([...chatHistory]);
    }

    const interval = setInterval(() => {
      setProcessingTime(
        Math.floor((Date.now() - processingStartTime.current) / 1000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, isStreaming, chatHistory.length, clearInactivityTimeout, setInactivityTimeout]);

  const handleConfirmation = (dontAskAgain?: boolean) => {
    confirmationService.confirmOperation(true, dontAskAgain);
    setConfirmationOptions(null);
  };

  const handleRejection = (feedback?: string) => {
    confirmationService.rejectOperation(feedback);
    setConfirmationOptions(null);

    // Reset processing states when operation is cancelled
    setIsProcessing(false);
    setIsStreaming(false);
    setTokenCount(0);
    setProcessingTime(0);
    processingStartTime.current = 0;
  };

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* Debug render counter to detect flicker */}
      <Text color="red" dimColor>Renders: {renderCount}</Text>
      {/* Show tips only when no chat history and no confirmation dialog */}
      {chatHistory.length === 0 && !confirmationOptions && (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="#00C7B7" bold>
            Tips for getting started:
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text color="gray">
              1. Ask questions, edit files, or run commands.
            </Text>
            <Text color="gray">2. Be specific for the best results.</Text>
            <Text color="gray">
              3. Create GROK.md files to customize your interactions with Grok.
            </Text>
            <Text color="gray">
              4. Press Shift+Tab to toggle auto-edit mode.
            </Text>
            <Text color="gray">5. /help for more information.</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">
          Type your request in natural language. Ctrl+C to clear, 'exit' to
          quit.
        </Text>
      </Box>

      <Box flexDirection="column" ref={scrollRef}>
        <ChatHistoryMemo
          timelineRenderer={timelineRenderer}
          isConfirmationActive={!!confirmationOptions}
          isStreaming={isStreaming}
        />
      </Box>

      {/* Show confirmation dialog if one is pending */}
      {confirmationOptions && (
        <ConfirmationDialog
          operation={confirmationOptions.operation}
          filename={confirmationOptions.filename}
          showVSCodeOpen={confirmationOptions.showVSCodeOpen}
          content={confirmationOptions.content}
          onConfirm={handleConfirmation}
          onReject={handleRejection}
        />
      )}

      {!confirmationOptions && (
        <>
          <LoadingSpinner
            isActive={isProcessing && !isStreaming}
            processingTime={processingTime}
            tokenCount={tokenCount}
          />

          <ChatInputMemo
            input={input}
            cursorPosition={cursorPosition}
            isProcessing={isProcessing}
            isStreaming={isStreaming}
          />

          <Box flexDirection="row" marginTop={1}>
            <Box marginRight={2}>
              <Text color="cyan">
                {autoEditEnabled ? '▶' : '⏸'} auto-edit:{' '}
                {autoEditEnabled ? 'on' : 'off'}
              </Text>
              <Text color="gray" dimColor>
                {' '}
                (shift + tab)
              </Text>
            </Box>
            <Box marginRight={2}>
              <Text color="yellow">≋ {agent.getCurrentModel()}</Text>
            </Box>
            <MCPStatus />
          </Box>

          <CommandSuggestions
            suggestions={commandSuggestions}
            input={input}
            selectedIndex={selectedCommandIndex}
            isVisible={showCommandSuggestions}
          />

          <ModelSelection
            models={availableModels}
            selectedIndex={selectedModelIndex}
            isVisible={showModelSelection}
            currentModel={agent.getCurrentModel()}
          />
        </>
      )}
    </Box>
  );
}

// Memoized ChatHistory to prevent unnecessary re-renders
const ChatHistoryMemo = memo(ChatHistory);
const ChatInputMemo = memo(ChatInput);

// Main component that handles API key input or chat interface
export default function ChatInterface({
  agent,
  initialMessage,
  applyMode = false,
  diffMode = true,
  fullFileMode = false,
  repoMode = false,
  repoSnapshot = '',
  debugUi = false,
}: ChatInterfaceProps) {
  const [currentAgent, setCurrentAgent] = useState<GrokAgent | null>(
    agent || null
  );

  const handleApiKeySet = (newAgent: GrokAgent) => {
    setCurrentAgent(newAgent);
  };

  if (!currentAgent) {
    return <ApiKeyInput onApiKeySet={handleApiKeySet} />;
  }

  return (
    <ChatInterfaceWithAgent
      agent={currentAgent}
      initialMessage={initialMessage}
      applyMode={applyMode}
      diffMode={diffMode}
      fullFileMode={fullFileMode}
      repoMode={repoMode}
      repoSnapshot={repoSnapshot}
      debugUi={debugUi}
    />
  );
}
