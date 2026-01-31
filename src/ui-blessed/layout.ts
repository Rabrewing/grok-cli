import blessed from 'neo-blessed';

export interface LayoutElements {
  screen: blessed.Widgets.Screen;
  transcript: blessed.Widgets.BoxElement;
  worklog: blessed.Widgets.BoxElement;
  input: blessed.Widgets.TextboxElement;
}

export function createLayout(): LayoutElements {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Grok CLI',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
    },
  });

  const transcript = blessed.box({
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

  const worklog = blessed.box({
    top: '100%-6',
    left: 0,
    width: '100%',
    height: 3,
    hidden: true,
    scrollable: true,
    alwaysScroll: true,
    style: {
      fg: 'yellow',
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

  screen.append(transcript);
  screen.append(worklog);
  screen.append(input);

  return { screen, transcript, worklog, input };
}