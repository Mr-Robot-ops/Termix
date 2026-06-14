export interface CommandAutocompleteVisibilityState {
  connectionError?: string | null;
  isConnected: boolean;
  isConnecting?: boolean;
  showAutocomplete: boolean;
  showDisconnectedOverlay?: boolean;
  suggestionCount: number;
}

export function shouldRenderCommandAutocomplete({
  connectionError,
  isConnected,
  isConnecting = false,
  showAutocomplete,
  showDisconnectedOverlay = false,
  suggestionCount,
}: CommandAutocompleteVisibilityState) {
  return (
    showAutocomplete &&
    suggestionCount > 0 &&
    isConnected &&
    !isConnecting &&
    !showDisconnectedOverlay &&
    !connectionError
  );
}

