export const COMMAND_AUTOCOMPLETE_SUGGESTION_ROW_HEIGHT = 32;
export const COMMAND_AUTOCOMPLETE_AUTOMATIC_VISIBLE_ROWS = 5;
export const COMMAND_AUTOCOMPLETE_MANUAL_VISIBLE_ROWS = 8;

interface CommandAutocompleteLayoutRow {
  hasSourceBoundary?: boolean;
}

export function getCommandAutocompleteVisibleRowCount(automatic: boolean) {
  return automatic
    ? COMMAND_AUTOCOMPLETE_AUTOMATIC_VISIBLE_ROWS
    : COMMAND_AUTOCOMPLETE_MANUAL_VISIBLE_ROWS;
}

export function getCommandAutocompleteListHeight(
  rows: CommandAutocompleteLayoutRow[],
  automatic: boolean,
) {
  const visibleRows = rows.slice(
    0,
    getCommandAutocompleteVisibleRowCount(automatic),
  );

  return visibleRows.length * COMMAND_AUTOCOMPLETE_SUGGESTION_ROW_HEIGHT;
}
