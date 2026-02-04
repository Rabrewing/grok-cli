import blessed, { Widgets } from 'neo-blessed';
import { BREWVERSE_THEME, MESSAGE_TYPES } from './theme.js';

export interface EnhancedMessage {
  type: keyof typeof MESSAGE_TYPES;
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    result?: any;
    status?: 'running' | 'success' | 'error';
  };
}

export interface WorkLogEntry {
  id: string;
  type: string;
  label: string;
  detail: string;
  timestamp: Date;
  status: 'running' | 'success' | 'error';
}

export interface LayoutElements {
  screen: Widgets.Screen;
  header?: Widgets.BoxElement;
  chat?: Widgets.BoxElement;
  worklog?: Widgets.BoxElement;
  inputBox: Widgets.TextboxElement;
  status?: Widgets.BoxElement;
  transcript?: Widgets.BoxElement;
  modelInfo?: Widgets.BoxElement;
  stream: Widgets.BoxElement;
  timelineBox: Widgets.BoxElement;
  confirmBar: Widgets.BoxElement;
}

export function createEnhancedLayout(): LayoutElements {
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    autoPadding: true,
    title: 'BrewVerse Terminal - Grok CLI',
  });

  // Header with BrewVerse branding (simplified for compatibility)
  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 2,
    content: '🚀 BrewVerse Terminal • Grok CLI v1.0',
    style: {
      fg: 'yellow',
      bg: 'blue',
      bold: true,
    },
    border: {
      type: 'line',
    },
  });

  // Model info and status in header
  const modelInfo = blessed.box({
    parent: header,
    right: 1,
    top: 0,
    width: 30,
    height: 1,
    content: 'Model: grok-4-latest',
    style: {
      fg: 'gray',
    },
  });

  const status = blessed.box({
    parent: header,
    right: 1,
    top: 1,
    width: 20,
    height: 1,
    content: '● Ready',
    style: {
      fg: 'cyan',
      bold: true,
    },
  });

  // Main chat pane (70% width)
  const chat = blessed.box({
    parent: screen,
    top: 2,
    left: 0,
    width: '70%',
    height: '100%-7',
    content: '',
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: true,
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'gray',
      },
    },
    border: {
      type: 'line',
    },
    label: ' Chat ',
  });

  // Work log pane (30% width, toggleable)
  const worklog = blessed.box({
    parent: screen,
    top: 2,
    right: 0,
    width: '30%',
    height: '100%-7',
    content: '',
    scrollable: true,
    keys: true,
    mouse: true,
    style: {
      fg: 'gray',
      bg: 'black',
      border: {
        fg: 'magenta',
      },
    },
    border: {
      type: 'line',
    },
    label: ' Work Log ',
  });

  // Input area (fixed at bottom)
  const inputContainer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 5,
    content: '',
    style: {
      fg: 'white',
      bg: 'blue',
      border: {
        fg: 'cyan',
      },
    },
    border: {
      type: 'line',
    },
  });

  const input = blessed.textbox({
    parent: inputContainer,
    top: 1,
    left: 1,
    right: 1,
    height: 3,
    inputOnFocus: true,
    mouse: true,
    keys: true,
    style: {
      fg: 'white',
      bg: 'black',
      focus: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'cyan',
        },
      },
    },
  });

  const confirmBar = blessed.box({
    hidden: true,
  });

  // Transcript area inside chat pane
  const transcript = blessed.box({
    parent: chat,
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    content: '',
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: true,
    style: {
      fg: 'white',
      bg: 'black',
    },
  });

  return {
    screen,
    header,
    chat,
    worklog,
    inputBox: input,
    status,
    transcript,
    modelInfo,
    stream: transcript,
    timelineBox: transcript,
    confirmBar: confirmBar,
  };
}