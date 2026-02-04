export interface UIAdapter {
  // Input from UI
  processUserMessage(text: string): Promise<void>;
  // Output to UI
  appendUserMessage(text: string): void;
  appendAssistantMessage(text: string): void;
  startAssistantMessage(id: string): void;
  appendAssistantChunk(id: string, chunk: string): void;
  endAssistantMessage(id: string): void;
  appendWork(event: string): void;
  appendToolResult(tool: string, status: string, exitCode: number, stdout: string, stderr: string, duration: number): void;
  appendDiff(filePath: string, diff: string): void;
  appendCommand(command: string, output: string): void;
  appendConfirmation(prompt: string, options: string[]): void;
  appendCompletionSummary(summary: string): void;
  requestConfirmation(prompt: string, options: string[], callback: (response: string) => void): void;
  setStatus(text: string): void;
  clearAll(): void;
  shutdown(): void;
}