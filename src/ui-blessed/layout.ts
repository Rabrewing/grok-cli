import blessed from 'neo-blessed';
import { BREWVERSE_THEME } from './theme.js';

export interface LayoutElements {
  screen: blessed.Widgets.Screen;
  timelineBox: blessed.Widgets.BoxElement;
  confirmBar: blessed.Widgets.BoxElement;
  inputBox: blessed.Widgets.TextboxElement;
  // Compatibility dummies
  stream: blessed.Widgets.BoxElement;
  header?: blessed.Widgets.BoxElement;
  chat?: blessed.Widgets.BoxElement;
  worklog?: blessed.Widgets.BoxElement;
  status?: blessed.Widgets.BoxElement;
  transcript?: blessed.Widgets.BoxElement;
  modelInfo?: blessed.Widgets.BoxElement;
  input?: blessed.Widgets.TextboxElement;
}

export function createLayout(): LayoutElements {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'BrewGrok CLI - Unified Stream',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
    },
  });

  screen.enableMouse();

  const timelineBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%-4', // 3 for input + 1 for confirm
    scrollable: true,
    alwaysScroll: true,
    mouse: false, // Disable to allow terminal mouse selection for copying
    tags: true, // Enable Blessed inline tags
    scrollbar: {
      ch: ' ',
      style: {
        bg: BREWVERSE_THEME.colors.teal,
        fg: BREWVERSE_THEME.colors.gold,
      },
    },
    style: {
      fg: 'white',
      bg: 'black',
    },
    border: {
      type: 'line',
    },
    padding: {
      left: 1,
      right: 1,
    },
  });

  const confirmBar = blessed.box({
    bottom: 3,
    left: 0,
    width: '100%',
    height: 1,
    hidden: true,
    style: {
      fg: 'yellow',
      bg: 'black',
      bold: true,
    },
  });

  const inputBox = blessed.textbox({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    inputOnFocus: true,
    style: {
      fg: BREWVERSE_THEME.colors.inputText, // BrewGold for input text
      bg: BREWVERSE_THEME.colors.teal,       // BrewTeal background
    },
    border: {
      type: 'line',
      fg: BREWVERSE_THEME.colors.gold,       // BrewGold border
    },
    padding: {
      left: 1,
      right: 1,
    },
  });

  // Dummy boxes for compatibility
  const header = blessed.box({ hidden: true });
  const worklog = blessed.box({ hidden: true });
  const status = blessed.box({ hidden: true });
  const modelInfo = blessed.box({ hidden: true });

  screen.append(timelineBox);
  screen.append(confirmBar);
  screen.append(inputBox);

  return {
    screen,
    timelineBox,
    confirmBar,
    inputBox,
    stream: timelineBox,
    header,
    chat: timelineBox,
    worklog,
    status,
    transcript: timelineBox,
    modelInfo,
    input: inputBox,
  };
}