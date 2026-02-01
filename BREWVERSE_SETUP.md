# BrewVerse Terminal Setup Guide

## 🎨 Windows Terminal Configuration

### Theme Settings
Add this to your Windows Terminal `settings.json`:

```json
{
  "profiles": {
    "defaults": {
      "fontFace": "JetBrains Mono",
      "fontSize": 12,
      "colorScheme": "BrewVerse Dark",
      "cursorShape": "bar"
    }
  },
  "schemes": [
    {
      "name": "BrewVerse Dark",
      "background": "#0B0F14",
      "foreground": "#E5E7EB",
      "cursor": "#00C7B7",
      "selectionBackground": "#1F2937",
      "black": "#0B0F14",
      "red": "#FF5A5F",
      "green": "#00C7B7",
      "yellow": "#FFD700",
      "blue": "#3B82F6",
      "purple": "#9C27B0",
      "cyan": "#00C7B7",
      "white": "#E5E7EB",
      "brightBlack": "#1F2937",
      "brightRed": "#FF5A5F",
      "brightGreen": "#00C7B7",
      "brightYellow": "#FFD700",
      "brightBlue": "#3B82F6",
      "brightPurple": "#9C27B0",
      "brightCyan": "#00C7B7",
      "brightWhite": "#F9FAFB"
    }
  ],
  "rendering": {
    "useSoftwareRendering": false,
    "useAcceleratedPaint": true,
    "experimental.rendering.forceFullRepaint": false
  },
  "scrolling": {
    "altGrScrolling": true,
    "ctrlShiftScrolling": false,
    "scrollToInput": false
  }
}
```

### Performance Settings
- ✅ **GPU Acceleration**: ON
- ✅ **Software Rendering**: OFF (unless needed)
- ✅ **Anti-flicker**: Enabled by default in BrewVerse

## 🚀 BrewVerse Features

### Advanced Command System
- `/help` - Show all commands
- `/clear` - Clear transcript  
- `/models` - Switch AI models
- `/apply` - Toggle apply mode
- `/work` - Toggle work log
- `/snap` - Generate repo snapshot
- `/status` - Show system status

### Enhanced Keyboard Shortcuts
- `Ctrl+C` - Exit
- `Ctrl+L` - Clear screen
- `Ctrl+W` - Toggle work log
- `Ctrl+U` - Clear input
- `Ctrl+←/→` - Word navigation
- `PageUp/Down` - Scroll transcript
- `End/Home` - Jump to bottom
- `F1` - Help
- `F2` - Model selection
- `F3` - Apply mode toggle
- `Tab` - Command completion

### Visual Features
- **Flicker-free streaming** with 100ms buffer cadence
- **Auto-scroll control** - pauses when user scrolls up
- **Rich work visibility** - detailed tool execution feedback
- **Token counting** - real-time usage display
- **Processing states** - visual thinking feedback
- **Multi-pane layout** - chat + work log + fixed input

## 🎯 Performance Optimizations

### Anti-Flicker Technology
1. **Buffered Streaming**: Tokens accumulate in memory, render on cadence
2. **Render Windowing**: Only display recent 35 messages
3. **Smart Repainting**: Only update changed screen regions
4. **Stable Input**: Input area never moves or scrolls

### Memory Management
- Efficient message history with circular buffer
- Automatic cleanup of old entries
- Optimized render loop at 60fps target

## 🔧 Customization

### Environment Variables
```bash
export GROK_UI=blessed      # Use enhanced UI
export GROK_THEME=BrewVerse  # Theme selection
export GROK_RENDER_FPS=16    # Refresh rate
export GROK_BUFFER_MS=100     # Stream buffer cadence
```

### Configuration File: `~/.grok/brewverse.json`
```json
{
  "theme": "BrewVerse Dark",
  "ui": {
    "showWorkLog": true,
    "autoScroll": true,
    "maxHistory": 35,
    "bufferCadence": 100
  },
  "keyboard": {
    "wordNavigation": true,
    "tabCompletion": true,
    "historySize": 100
  },
  "performance": {
    "renderFPS": 16,
    "gpuAcceleration": true,
    "antiFlicker": true
  }
}
```

## 🐛 Troubleshooting

### Flickering Issues
1. Ensure GPU acceleration is ON
2. Disable "retro terminal effects"
3. Update Windows Terminal to latest version
4. Try JetBrains Mono font

### Performance Issues
1. Close other high-CPU applications
2. Reduce `maxHistory` in config
3. Increase `bufferCadence` to 150ms
4. Disable work log if not needed

### Input Problems
1. Check keyboard layout in Windows Terminal
2. Verify `cursorShape: "bar"` in settings
3. Try different font (Fira Code fallback)

---

**🎉 Enjoy your enhanced BrewVerse Terminal experience!**