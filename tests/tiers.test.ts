import { describe, expect, it } from "vitest";
import { chapterUnlocked, holderGoalForChapter, nextReadingTier, rawToUi, uiTokensToRaw, visibleChapters } from "../src/lib/tiers";

describe("holder tiers", () => {
  it("converts ui tokens to raw units at 6 decimals", () => {
    expect(uiTokensToRaw("100000")).toBe(100_000n * 1_000_000n);
    expect(uiTokensToRaw("1.5")).toBe(1_500_000n);
    expect(rawToUi(100_000n * 1_000_000n)).toBe("100000");
  });

  it("seals a chapter when the balance drops below the tier", () => {
    expect(chapterUnlocked(uiTokensToRaw("99999"), "100000")).toBe(false);
    expect(chapterUnlocked(uiTokensToRaw("100000"), "100000")).toBe(true);
    const chapters = [
      { index: 1, title: "One", body: "open", minTokens: "0" },
      { index: 2, title: "Two", body: "secret", minTokens: "100000" },
    ];
    const visible = visibleChapters(chapters, uiTokensToRaw("10"));
    expect(visible[0]).toMatchObject({ locked: false, body: "open" });
    expect(visible[1]).toEqual({ index: 2, title: "Two", minTokens: "100000", locked: true });
    expect(JSON.stringify(visible[1])).not.toContain("secret");
  });

  it("raises the next reading tier and the holder goal", () => {
    expect(nextReadingTier([{ minTokens: "1000000" }])).toBe("2000000");
    expect(holderGoalForChapter(4)).toBeNull();
    expect(holderGoalForChapter(5, 100, 150)).toBe(100);
    expect(holderGoalForChapter(6, 100, 150)).toBe(250);
  });
});
