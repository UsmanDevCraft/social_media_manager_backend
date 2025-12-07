import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex");

export function encrypt(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString(
    "hex"
  )}`;
}

export function decrypt(payload: string) {
  const [ivHex, tagHex, encHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out.toString("utf8");
}
