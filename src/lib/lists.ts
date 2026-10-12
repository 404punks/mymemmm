export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinList(values: string[]): string {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return unique.length ? `|${unique.join("|")}|` : "";
}

export function hasKey(stored: string, key: string): boolean {
  return stored.includes(`|${key}|`);
}
