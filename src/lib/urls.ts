const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function normalizePublicUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid http(s) URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http and https URLs can be indexed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not accepted");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private or local URLs cannot be indexed");
  }
  if (isPrivateIpv4(host)) {
    throw new Error("Private network URLs cannot be indexed");
  }
  url.hash = "";
  url.hostname = host;
  return url.toString();
}

export function canonicalSourceId(sourceType: string, externalId: string): string {
  const type = sourceType.trim().toLowerCase();
  const id = externalId.trim().replace(/\s+/g, "");
  if (!type || !id) throw new Error("Source identity is incomplete");
  return `${type}:${id}`;
}

export function allowlistedFetchHost(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return (
    host === "huggingface.co" ||
    host.endsWith(".huggingface.co") ||
    host === "api.github.com" ||
    host === "github.com" ||
    host === "registry.modelcontextprotocol.io"
  );
}
