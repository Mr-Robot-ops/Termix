export const COMMAND_HISTORY_CHANGED_EVENT = "terminalCommandHistoryChanged";

export type CommandHistoryChangedEventDetail =
  | {
      action: "delete";
      hostId: number;
      command: string;
    }
  | {
      action: "clear";
      hostId: number;
    };

export function applyCommandHistoryChangeToList(
  history: string[],
  detail: CommandHistoryChangedEventDetail,
) {
  if (detail.action === "clear") {
    return [];
  }

  return history.filter((command) => command !== detail.command);
}

export function notifyCommandHistoryChanged(
  detail: CommandHistoryChangedEventDetail,
) {
  window.dispatchEvent(
    new CustomEvent<CommandHistoryChangedEventDetail>(
      COMMAND_HISTORY_CHANGED_EVENT,
      { detail },
    ),
  );
}
