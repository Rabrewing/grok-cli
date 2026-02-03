import blessed from 'neo-blessed';

export interface LayoutElements {
  screen: blessed.Widgets.Screen;
  stream: blessed.Widgets.BoxElement;
  input: blessed.Widgets.TextboxElement;
  // Compatibility dummies
  header?: blessed.Widgets.BoxElement;
  chat?: blessed.Widgets.BoxElement;
  worklog?: blessed.Widgets.BoxElement;
  status?: blessed.Widgets.BoxElement;
  transcript?: blessed.Widgets.BoxElement;
  modelInfo?: blessed.Widgets.BoxElement;
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

  const stream = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%-3',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        bg: 'blue',
      },
    },
    style: {
      fg: 'white',
      bg: 'black',
    },
  });

  const input = blessed.textbox({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    inputOnFocus: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Dummy boxes for compatibility with enhanced adapter
  const header = blessed.box({ hidden: true });
  const worklog = blessed.box({ hidden: true });
  const status = blessed.box({ hidden: true });
  const modelInfo = blessed.box({ hidden: true });

  screen.append(stream);
  screen.append(input);

  return { screen, stream, input, header, chat: stream, worklog, status, transcript: stream, modelInfo };
}