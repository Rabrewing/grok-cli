export interface UIAdapter {
  // Input from UI
  processUserMessage(text: string): void;
  // Output to UI
  appendUserMessage(text: string): void;
  startAssistantMessage(id: string): void;
  appendAssistantChunk(id: string, chunk: string): void;
  endAssistantMessage(id: string): void;
  appendWork(event: string): void;
  setStatus(text: string): void;
  clearAll(): void;
  shutdown(): void;
}