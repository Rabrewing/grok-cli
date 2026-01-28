import { useState, useCallback } from "react";
import { useInputHistory } from "./use-input-history.js";

interface UseEnhancedInputProps {
  onSubmit?: (text: string) => void;
  onEscape?: () => void;
  onSpecialKey?: (key: any) => boolean;
  onInputChange?: (text: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}

interface EnhancedInputHook {
  input: string;
  cursorPosition: number;
  showCommandSuggestions: boolean;
  selectedCommandIndex: number;
  showModelSelection: boolean;
  selectedModelIndex: number;
  handleInput: (key: any) => void;
  setInput: (text: string) => void;
  setCursorPosition: (position: number) => void;
  setShowCommandSuggestions: (show: boolean) => void;
  setSelectedCommandIndex: (index: number) => void;
  setShowModelSelection: (show: boolean) => void;
  setSelectedModelIndex: (index: number) => void;
  clearInput: () => void;
  resetHistory: () => void;
}

export function useInputHandler({
  onSubmit,
  onEscape,
  onSpecialKey,
  onInputChange,
  disabled = false,
  multiline = false,
}: UseEnhancedInputProps): EnhancedInputHook {
  const [input, setInputState] = useState("");
  const [cursorPosition, setCursorPositionState] = useState(0);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);

  const {
    addToHistory,
    navigateHistory,
    resetHistory,
    setOriginalInput,
    isNavigatingHistory,
  } = useInputHistory();

  const setInput = useCallback((text: string) => {
    setInputState(text);
    setCursorPositionState(Math.min(text.length, cursorPosition));
    if (!isNavigatingHistory()) {
      setOriginalInput(text);
    }
    onInputChange?.(text);
  }, [cursorPosition, isNavigatingHistory, setOriginalInput, onInputChange]);

  const setCursorPosition = useCallback((position: number) => {
    setCursorPositionState(Math.max(0, Math.min(input.length, position)));
  }, [input.length]);

  const clearInput = useCallback(() => {
    setInputState("");
    setCursorPositionState(0);
    if (!isNavigatingHistory()) {
      setOriginalInput("");
    }
    onInputChange?.("");
  }, [setOriginalInput, onInputChange, isNavigatingHistory]);

  const handleInput = useCallback((key: any) => {
    if (disabled) return;

    // Handle Enter key submission
    if (key.name === 'return' || key.name === 'enter') {
      if (input.trim()) {
        addToHistory(input);
        onSubmit?.(input);
        setInput("");
        setCursorPosition(0);
      }
      return;
    }

    // Handle Escape
    if (key.name === 'escape') {
      onEscape?.();
      return;
    }

    // Let special key handler take precedence
    if (onSpecialKey?.(key)) {
      return;
    }

    // Handle basic text input
    if (key.char) {
      const newInput = input.slice(0, cursorPosition) + key.char + input.slice(cursorPosition);
      setInput(newInput);
      setCursorPosition(cursorPosition + 1);
      return;
    }

    // Handle backspace
    if (key.name === 'backspace') {
      if (cursorPosition > 0) {
        const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
        setInput(newInput);
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }

    // Handle delete
    if (key.name === 'delete') {
      if (cursorPosition < input.length) {
        const newInput = input.slice(0, cursorPosition) + input.slice(cursorPosition + 1);
        setInput(newInput);
      }
      return;
    }

    // Handle arrow keys
    if (key.name === 'left') {
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }
    if (key.name === 'right') {
      setCursorPosition(Math.min(input.length, cursorPosition + 1));
      return;
    }
    if (key.name === 'home' || (key.name === 'a' && key.ctrl)) {
      setCursorPosition(0);
      return;
    }
    if (key.name === 'end' || (key.name === 'e' && key.ctrl)) {
      setCursorPosition(input.length);
      return;
    }

    // Handle history navigation
    if (key.name === 'up') {
      if (showCommandSuggestions) {
        setSelectedCommandIndex(Math.max(0, selectedCommandIndex - 1));
      } else {
        const newInput = navigateHistory('up');
        if (newInput !== input) {
          setInput(newInput);
          setCursorPosition(newInput.length);
        }
      }
      return;
    }
    if (key.name === 'down') {
      if (showCommandSuggestions) {
        setSelectedCommandIndex(selectedCommandIndex + 1);
      } else {
        const newInput = navigateHistory('down');
        if (newInput !== input) {
          setInput(newInput);
          setCursorPosition(newInput.length);
        }
      }
      return;
    }
  }, [
    input, 
    cursorPosition, 
    disabled, 
    showCommandSuggestions, 
    selectedCommandIndex, 
    setInput, 
    setCursorPosition, 
    addToHistory, 
    onSubmit, 
    onEscape, 
    onSpecialKey,
    navigateHistory,
    setSelectedCommandIndex
  ]);

  return {
    input,
    cursorPosition,
    showCommandSuggestions,
    selectedCommandIndex,
    showModelSelection,
    selectedModelIndex,
    handleInput,
    setInput,
    setCursorPosition,
    setShowCommandSuggestions,
    setSelectedCommandIndex,
    setShowModelSelection,
    setSelectedModelIndex,
    clearInput,
    resetHistory,
  };
}

export default useInputHandler;