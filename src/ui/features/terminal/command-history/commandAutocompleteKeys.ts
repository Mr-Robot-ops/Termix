export interface CommandAutocompleteKeyEvent {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export interface CommandAutocompleteKeyState {
  inputMode?: CommandAutocompleteInputMode;
  selectedIndex: number;
  selectionActive: boolean;
  suggestionCount: number;
}

export interface CommandAutocompleteGhostKeyState {
  cursorAtEnd: boolean;
  suggestionCount: number;
}

export type CommandAutocompleteInputMode =
  | "idle"
  | "typing"
  | "history"
  | "completion";

export type CommandAutocompleteKeyAction =
  | { type: "accept"; selectedIndex: number }
  | { type: "close" }
  | { type: "close-and-pass-through" }
  | { type: "deactivate-and-pass-through" }
  | { type: "move"; selectedIndex: number }
  | { type: "pass-through" };

export type CommandAutocompleteGhostKeyAction =
  | { type: "accept"; selectedIndex: number }
  | { type: "close" }
  | { type: "pass-through" };

function hasPlainModifierState(event: CommandAutocompleteKeyEvent) {
  return !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
}

export function getCommandAutocompleteInputModeAfterTerminalData(
  data: string,
  currentMode: CommandAutocompleteInputMode = "idle",
): CommandAutocompleteInputMode {
  if (!data) {
    return currentMode;
  }

  if (data.includes("\r") || data.includes("\n")) {
    return "idle";
  }

  if (data.includes("\u0003") || data.includes("\u0004")) {
    return "idle";
  }

  if (data.includes("\u001b[A") || data.includes("\u001b[B")) {
    return "history";
  }

  if (
    data.includes("\x08") ||
    data.includes("\x7f") ||
    data.includes("\u001b[3~") ||
    /[\x20-\x7e]/.test(data)
  ) {
    return "typing";
  }

  return currentMode;
}

export function getCommandAutocompleteGhostKeyAction(
  event: CommandAutocompleteKeyEvent,
  state: CommandAutocompleteGhostKeyState,
): CommandAutocompleteGhostKeyAction {
  if (event.key === "Escape") {
    return { type: "close" };
  }

  if (
    event.key === "Tab" &&
    hasPlainModifierState(event) &&
    state.cursorAtEnd &&
    state.suggestionCount > 0
  ) {
    return { type: "accept", selectedIndex: 0 };
  }

  return { type: "pass-through" };
}

export function getCommandAutocompletePopupKeyAction(
  event: CommandAutocompleteKeyEvent,
  state: CommandAutocompleteKeyState,
): CommandAutocompleteKeyAction {
  if (event.key === "Escape") {
    return { type: "close" };
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (state.suggestionCount <= 0) {
      return { type: "close" };
    }

    const inputMode = state.inputMode ?? "history";
    const completionActive =
      state.selectionActive || inputMode === "completion";

    if (!completionActive && inputMode === "typing") {
      return {
        type: "move",
        selectedIndex: event.key === "ArrowDown" ? 0 : state.suggestionCount - 1,
      };
    }

    if (!completionActive) {
      return { type: "close-and-pass-through" };
    }

    if (event.key === "ArrowDown") {
      return {
        type: "move",
        selectedIndex:
          state.selectedIndex < state.suggestionCount - 1
            ? state.selectedIndex + 1
            : 0,
      };
    }

    return {
      type: "move",
      selectedIndex:
        state.selectedIndex > 0 ? state.selectedIndex - 1 : state.suggestionCount - 1,
    };
  }

  if (event.key === "Enter") {
    return state.selectionActive && state.suggestionCount > 0
      ? { type: "accept", selectedIndex: state.selectedIndex }
      : { type: "close-and-pass-through" };
  }

  if (event.key === "Tab" && hasPlainModifierState(event)) {
    return state.suggestionCount > 0
      ? { type: "accept", selectedIndex: state.selectedIndex }
      : { type: "close" };
  }

  if (
    [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
    ].includes(event.key) ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  ) {
    return { type: "close-and-pass-through" };
  }

  if (event.key.length === 1) {
    return { type: "deactivate-and-pass-through" };
  }

  return { type: "close-and-pass-through" };
}
