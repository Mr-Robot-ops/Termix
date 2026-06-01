export function normalizeTerminalLineSuffix(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trimEnd();
}

export function extractRenderedCommandFromLine(
  line: string,
  trackedCommand: string,
) {
  const normalizedLine = normalizeTerminalLineSuffix(line).trimEnd();
  const normalizedTrackedCommand =
    normalizeTerminalLineSuffix(trackedCommand).trim();

  if (!normalizedLine) {
    return "";
  }

  if (normalizedTrackedCommand) {
    const trackedIndex = normalizedLine.lastIndexOf(normalizedTrackedCommand);
    if (trackedIndex !== -1) {
      return normalizedLine.slice(trackedIndex).trim();
    }
  }

  const promptMatch = normalizedLine.match(
    /^(?:PS\s+[A-Z]:\\.*>|[\w.-]+@[\w.-]+(?::[^\s#$>]*)?\s?[$#]|[^\s]+[$#>])\s+(.+)$/i,
  );
  return promptMatch?.[1]?.trim() ?? "";
}

export function terminalLineLooksLikeSecretPrompt(line: string) {
  return /\b(?:password|passphrase|verification code|otp|totp)\b/i.test(line);
}
