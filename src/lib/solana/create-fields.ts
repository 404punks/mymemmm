export function assertCreateFields(input: { name: string; symbol: string; uri: string }) {
  if (input.name.length < 1 || input.name.length > 32) throw new Error("Name must be 1–32 characters");
  if (input.symbol.length < 1 || input.symbol.length > 13) throw new Error("Symbol must be 1–13 characters");
  if (input.uri.length < 1 || input.uri.length > 200) throw new Error("Metadata URI exceeds 200 characters");
}
