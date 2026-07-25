import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token firmado del QR de check-in: `base64url(payload).base64url(hmac)`.
 * La firma HMAC-SHA256 con QR_SECRET hace el QR infalsificable: cualquier
 * alteración del id, evento o dorsal invalida el token. Solo servidor.
 */
export interface CheckinPayload {
  /** id de la inscripción */
  id: string;
  /** event_slug */
  slug: string;
  dorsal: number;
}

function hmac(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

/** null si QR_SECRET no está configurado */
export function signCheckinToken(payload: CheckinPayload): string | null {
  const secret = process.env.QR_SECRET;
  if (!secret) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = hmac(encoded, secret).toString("base64url");
  return `${encoded}.${signature}`;
}

/** null si el token es inválido, fue alterado o falta QR_SECRET */
export function verifyCheckinToken(token: string): CheckinPayload | null {
  const secret = process.env.QR_SECRET;
  if (!secret) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = hmac(encoded, secret);
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    if (
      typeof payload?.id === "string" &&
      typeof payload?.slug === "string" &&
      typeof payload?.dorsal === "number"
    ) {
      return payload as CheckinPayload;
    }
    return null;
  } catch {
    return null;
  }
}
