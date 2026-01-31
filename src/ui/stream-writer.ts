/**
 * Hybrid Stream Writer - Anti-Flicker Streaming Utility
 * 
 * Writes streaming chunks directly to stdout without triggering Ink re-renders.
 * This prevents React/Ink from repainting the entire screen on every token.
 */

interface StreamSession {
  id: string;
  startedAt: number;
  isActive: boolean;
}

export class StreamWriter {
  private currentSession: StreamSession | null = null;
  private buffer: string = '';

  /**
   * Start a new streaming session for assistant output
   */
  beginAssistantStream(): string {
    const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      startedAt: Date.now(),
      isActive: true
    };

    // Write assistant header directly to stdout
    process.stdout.write('\nAssistant: ');
    
    return sessionId;
  }

  /**
   * Write a chunk of text to the current stream
   */
  writeChunk(text: string): void {
    if (!this.currentSession || !this.currentSession.isActive) {
      return;
    }

    // Handle carriage returns safely by replacing with spaces
    const safeText = text.replace(/\r/g, ' ');
    
    // Write directly to stdout without triggering React updates
    process.stdout.write(safeText);
    
    // Keep internal buffer for final commit
    this.buffer += safeText;
  }

  /**
   * End the current streaming session
   */
  endAssistantStream(): { finalText: string; sessionId: string } {
    if (!this.currentSession) {
      throw new Error('No active stream session to end');
    }

    // Write final newline
    process.stdout.write('\n');

    const result = {
      finalText: this.buffer,
      sessionId: this.currentSession.id
    };

    // Reset session state
    this.currentSession = null;
    this.buffer = '';

    return result;
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return this.currentSession?.isActive ?? false;
  }

  /**
   * Get current session info
   */
  getCurrentSession(): StreamSession | null {
    return this.currentSession;
  }

  /**
   * Force cleanup current session (for errors/aborts)
   */
  abortStream(): void {
    if (this.currentSession) {
      // Write newline to clean up terminal state
      process.stdout.write('\n');
      
      this.currentSession = null;
      this.buffer = '';
    }
  }

  /**
   * No-op flush method for compatibility
   */
  flush(): void {
    // stdout is typically line-buffered, but we let the system handle flushing
    // This method exists for API compatibility
  }
}

// Singleton instance for the application
export const streamWriter = new StreamWriter();