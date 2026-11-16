import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

function encryptionKey(): Buffer {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Integration credential encryption is not configured.");
  return createHash("sha256").update(secret).digest();
}

export function encryptIntegrationCredentials(credentials: Record<string, string>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptIntegrationCredentials(value: string): Record<string, string> {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored integration credentials use an unsupported format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plain) as Record<string, string>;
}

export function isPrivateNetworkAddress(address: string): boolean {
  const value = address.toLowerCase();
  if (value === "::1" || value === "::" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  if (isIP(value) !== 4) return false;
  const parts = value.split(".").map(Number);
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] >= 224;
}

export function validateExternalEndpoint(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a valid API endpoint URL."); }
  if (url.protocol !== "https:") throw new Error("External API endpoints must use HTTPS.");
  if (url.username || url.password) throw new Error("Credentials must not be included in the endpoint URL.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || isPrivateNetworkAddress(hostname)) {
    throw new Error("Private or local network endpoints are not allowed.");
  }
  return url;
}

export async function assertSafeExternalEndpoint(value: string): Promise<URL> {
  const url = validateExternalEndpoint(value);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateNetworkAddress(address))) {
    throw new Error("The endpoint resolves to a private or reserved network address.");
  }
  return url;
}
