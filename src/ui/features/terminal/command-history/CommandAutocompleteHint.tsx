interface CommandAutocompleteHintProps {
  completion: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeightPx?: number;
  position: { top: number; left: number };
  visible: boolean;
}

export function CommandAutocompleteHint({
  completion,
  fontFamily,
  fontSize,
  lineHeightPx,
  position,
  visible,
}: CommandAutocompleteHintProps) {
  if (!visible || !completion) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-[2147483646] select-none whitespace-pre text-muted-foreground/75"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        fontFamily,
        fontSize: fontSize ? `${fontSize}px` : undefined,
        lineHeight: lineHeightPx ? `${lineHeightPx}px` : undefined,
        fontWeight: 400,
        letterSpacing: "normal",
      }}
    >
      {completion}
    </div>
  );
}
