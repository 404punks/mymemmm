import { HttpError } from "./http";

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(child|minor|underage|loli|lolita)\b.{0,24}\b(sex|nude|porn|explicit)\b/i, reason: "Sexual content involving minors is blocked." },
  { pattern: /\b(porn|hentai|nude|nsfw|onlyfans)\b/i, reason: "Sexual content is blocked." },
  { pattern: /\b(kike|niggers|faggot|retard)\b/i, reason: "Hate speech is blocked." },
  { pattern: /\b(kill yourself|kys)\b/i, reason: "This text is blocked." },
];

const BRANDS = [
  "apple", "google", "microsoft", "amazon", "meta", "facebook", "instagram", "tesla", "nvidia", "openai",
  "anthropic", "disney", "marvel", "pokemon", "nintendo", "sony", "nike", "adidas", "gucci", "louis vuitton",
  "coca-cola", "pepsi", "mcdonald", "starbucks", "netflix", "spotify", "youtube", "tiktok", "binance", "coinbase",
  "solana", "phantom", "pump.fun", "pumpfun",
];

const PEOPLE = [
  "elon musk", "donald trump", "joe biden", "kamala harris", "barack obama", "taylor swift", "beyonce",
  "kanye west", "ye west", "mr beast", "mrbeast", "vitalik buterin", "anatoly yakovenko", "sam altman",
  "mark zuckerberg", "jeff bezos", "bill gates", "cristiano ronaldo", "lebron james", "lionel messi",
];

export function moderationFailure(text: string): string | null {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  for (const item of BLOCKED_PATTERNS) {
    if (item.pattern.test(normalized)) return item.reason;
  }
  for (const brand of BRANDS) {
    if (normalized.includes(brand)) return `Launches cannot copy the brand "${brand}".`;
  }
  for (const person of PEOPLE) {
    if (normalized.includes(person)) return `Launches cannot impersonate ${person}.`;
  }
  return null;
}

export function assertClean(fields: string[]) {
  for (const field of fields) {
    const failure = moderationFailure(field);
    if (failure) throw new HttpError(failure, 400, "moderation");
  }
}
