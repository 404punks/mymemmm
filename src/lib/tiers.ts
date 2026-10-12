export const TOKEN_DECIMALS = 6;
export const DEFAULT_MIN_TOKENS = ["0", "100000", "500000", "1000000"] as const;

export function uiTokensToRaw(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Token amount must be a positive number");
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > TOKEN_DECIMALS) throw new Error("Token amount has more than 6 decimal places");
  const fracPadded = (frac + "0".repeat(TOKEN_DECIMALS)).slice(0, TOKEN_DECIMALS);
  return BigInt(whole) * 10n ** BigInt(TOKEN_DECIMALS) + BigInt(fracPadded || "0");
}

export function rawToUi(raw: bigint): string {
  const negative = raw < 0n;
  const value = negative ? -raw : raw;
  const base = 10n ** BigInt(TOKEN_DECIMALS);
  const whole = value / base;
  const frac = (value % base).toString().padStart(TOKEN_DECIMALS, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

export function chapterUnlocked(rawBalance: bigint, minTokens: string): boolean {
  return rawBalance >= uiTokensToRaw(minTokens);
}

export function visibleChapters<T extends { index: number; title: string; body: string; minTokens: string }>(
  chapters: T[],
  rawBalance: bigint,
) {
  return chapters
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((chapter) => {
      const unlocked = chapterUnlocked(rawBalance, chapter.minTokens);
      if (unlocked) return { ...chapter, locked: false as const };
      return {
        index: chapter.index,
        title: chapter.title,
        minTokens: chapter.minTokens,
        locked: true as const,
      };
    });
}

export function nextReadingTier(chapters: { minTokens: string }[]): string {
  const highest = chapters.reduce((max, chapter) => {
    return uiTokensToRaw(chapter.minTokens) > uiTokensToRaw(max) ? chapter.minTokens : max;
  }, "0");
  const raw = uiTokensToRaw(highest);
  const step = raw === 0n ? uiTokensToRaw("100000") : raw * 2n;
  return rawToUi(step);
}

export function holderGoalForChapter(index: number, base = 100, step = 150): number | null {
  if (index <= 4) return null;
  return base + (index - 5) * step;
}
