export interface ColorPalette {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  inputText: string;
  gold: string;
  teal: string;
  red: string;
  purple: string;
}

export interface StyleTokens {
  colors: ColorPalette;
  fonts: {
    primary: string;
    mono: string;
  };
  spacing: {
    paddingX: number;
    paddingY: number;
    gap: number;
  };
  borders: {
    rounded: boolean;
    focused: string;
    normal: string;
  };
}

export const BREWVERSE_THEME: StyleTokens = {
  colors: {
    background: '#000000',         // deep space black
    surface: '#111827',          // panel charcoal
    border: '#1F2937',          // soft line
    textPrimary: '#ffffff',       // bright white
    textMuted: '#9ca3af',        // muted gray
    inputText: '#000000',         // Black for input text
    gold: '#ffd700',             // gold accent
    teal: '#00c7b7',            // teal accent
    red: '#ff5a5f',             // error red
    purple: '#9c27b0',          // tool purple
  },
  fonts: {
    primary: 'JetBrains Mono',
    mono: 'JetBrains Mono',
  },
  spacing: {
    paddingX: 2,
    paddingY: 1,
    gap: 1,
  },
  borders: {
    rounded: true,
    focused: '#00C7B7',
    normal: '#1F2937',
  },
};

export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  ERROR: 'error',
  WORK: 'work',
  STATUS: 'status',
} as const;

export const UI_CONSTANTS = {
  FLUSH_CADENCE: 100,        // ms
  RENDER_WINDOW: 35,           // max entries
  AUTO_SCROLL_PAUSE: '↑ New output (n)',
  RENDER_FPS: 16,             // ~60fps refresh
  WORK_LOG_MAX: 100,          // max work entries
} as const;