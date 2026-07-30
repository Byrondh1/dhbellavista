import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token firmado del QR de check-in: `base64url(payload).base64url(hmac)`.
 * La firma HMAC-SHA256 con QR_SECRET hace el QR infalsificable: cualquier
 * alteración del id, evento o identificador invalida el token. Solo servidor.
 */
export interface CheckinPayload {
  /** id de la inscripción */
  id: string;
  /** event_slug */
  slug: string;
  /**
   * Identificador del evento ya como texto: "7" (dorsal) o "PCX-1234"
   * (placa). Texto y no número para que sirva a cualquier tipo de evento
   * (ver lib/identificador.ts).
   */
  ref: string;
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
    if (typeof payload?.id !== "string" || typeof payload?.slug !== "string") {
      return null;
    }
    if (typeof payload.ref === "string") {
      return payload as CheckinPayload;
    }
    // Compatibilidad con los tokens emitidos antes de que el identificador
    // fuera texto: llevaban `dorsal` numérico. Firmados con el mismo secreto,
    // así que siguen siendo auténticos — no hay razón para invalidar PDFs ya
    // enviados.
    if (typeof payload.dorsal === "number") {
      return { id: payload.id, slug: payload.slug, ref: String(payload.dorsal) };
    }
    return null;
  } catch {
    return null;
  }
}
