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
  header: Widgets.BoxElement;
  chat: Widgets.BoxElement;
  worklog: Widgets.BoxElement;
  input: Widgets.TextboxElement;
  status: Widgets.BoxElement;
  transcript: Widgets.BoxElement;
  modelInfo: Widgets.BoxElement;
}

export function createEnhancedLayout(): LayoutElements {
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    dockBorders: true,
    title: 'BrewVerse Terminal - Grok CLI',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
      color: BREWVERSE_THEME.colors.teal,
    },
  });

  // Header with BrewVerse branding
  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 2,
    content: '🚀 BrewVerse Terminal • Grok CLI v1.0',
    tags: false,
    style: {
      fg: BREWVERSE_THEME.colors.gold,
      bg: BREWVERSE_THEME.colors.surface,
      border: {
        fg: BREWVERSE_THEME.colors.border,
      },
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
    tags: false,
    style: {
      fg: BREWVERSE_THEME.colors.textMuted,
    },
  });

  const status = blessed.box({
    parent: header,
    right: 1,
    top: 1,
    width: 20,
    height: 1,
    content: '● Ready',
    tags: false,
    style: {
      fg: BREWVERSE_THEME.colors.teal,
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
    scrollbar: {
      ch: ' ',
      style: {
        bg: BREWVERSE_THEME.colors.border,
        fg: BREWVERSE_THEME.colors.textMuted,
      },
    },
    style: {
      fg: BREWVERSE_THEME.colors.textPrimary,
      bg: BREWVERSE_THEME.colors.background,
      border: {
        fg: BREWVERSE_THEME.colors.border,
      },
    },
    border: {
      type: 'line',
    },
    label: ' Chat ',
    tags: false,
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
    scrollbar: {
      ch: ' ',
      style: {
        bg: BREWVERSE_THEME.colors.border,
        fg: BREWVERSE_THEME.colors.textMuted,
      },
    },
    style: {
      fg: BREWVERSE_THEME.colors.textMuted,
      bg: BREWVERSE_THEME.colors.background,
      border: {
        fg: BREWVERSE_THEME.colors.purple,
      },
    },
    border: {
      type: 'line',
    },
    label: ' Work Log ',
    tags: false,
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
      fg: BREWVERSE_THEME.colors.textPrimary,
      bg: BREWVERSE_THEME.colors.surface,
      border: {
        fg: BREWVERSE_THEME.colors.teal,
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
      fg: BREWVERSE_THEME.colors.textPrimary,
      bg: BREWVERSE_THEME.colors.background,
      focus: {
        fg: BREWVERSE_THEME.colors.textPrimary,
        bg: BREWVERSE_THEME.colors.background,
        border: {
          fg: BREWVERSE_THEME.colors.teal,
        },
      },
    },
    tags: true,
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
      fg: BREWVERSE_THEME.colors.textPrimary,
      bg: 'transparent',
    },
    tags: true,
  });

  return {
    screen,
    header,
    chat,
    worklog,
    input,
    status,
    transcript,
    modelInfo,
  };
}