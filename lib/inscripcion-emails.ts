import QRCode from "qrcode";
import type { EventConfig } from "./types";
import type { InscripcionRow } from "./inscripciones";
import {
  correoConfirmadaHtml,
  correoRecibidaHtml,
  sendEventEmail,
} from "./email";
import { renderInscripcionPdf, type PdfInscripcion } from "./pdf/inscripcion-pdf";
import { signCheckinToken } from "./qr-token";
import { getSiteUrl } from "./site-url";

/** Campos mínimos de la inscripción que necesitan los correos */
export type InscripcionParaCorreo = PdfInscripcion & { email: string };

export function rowParaCorreo(row: InscripcionRow): InscripcionParaCorreo {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    cedula: row.cedula,
    categoria: row.categoria,
    ciudad: row.ciudad,
    telefono: row.telefono,
    club: row.club,
    dorsal: row.dorsal,
    created_at: row.created_at,
  };
}

/** Correo 1: inscripción recibida + PDF provisional. Nunca lanza. */
export async function enviarCorreoRecibida(
  event: EventConfig,
  inscripcion: InscripcionParaCorreo,
): Promise<{ sent: boolean }> {
  try {
    const pdf = await renderInscripcionPdf(event, inscripcion, "provisional");
    return await sendEventEmail({
      event,
      to: inscripcion.email,
      subject: `Inscripción recibida — ${event.name}`,
      html: correoRecibidaHtml(event, inscripcion.nombre),
      attachments: [{ filename: "inscripcion-provisional.pdf", content: pdf }],
    });
  } catch (error) {
    console.error(`Correo 1 falló para la inscripción ${inscripcion.id}:`, error);
    return { sent: false };
  }
}

/**
 * Correo 2: inscripción confirmada + PDF definitivo con dorsal y QR firmado
 * de check-in. Si QR_SECRET no está configurado, el PDF sale sin QR (se
 * loguea el aviso) — el correo no se bloquea por eso. Nunca lanza.
 */
export async function enviarCorreoConfirmada(
  event: EventConfig,
  inscripcion: InscripcionParaCorreo,
): Promise<{ sent: boolean }> {
  try {
    let qrDataUrl: string | undefined;
    if (inscripcion.dorsal != null) {
      const token = signCheckinToken({
        id: inscripcion.id,
        slug: event.slug,
        dorsal: inscripcion.dorsal,
      });
      if (token) {
        const checkinUrl = `${getSiteUrl(event)}/admin/checkin?t=${token}`;
        qrDataUrl = await QRCode.toDataURL(checkinUrl, {
          margin: 1,
          width: 480,
          errorCorrectionLevel: "M",
        });
      } else {
        console.warn(
          `QR omitido en la inscripción ${inscripcion.id}: falta QR_SECRET.`,
        );
      }
    }

    const pdf = await renderInscripcionPdf(
      event,
      inscripcion,
      "definitivo",
      qrDataUrl,
    );
    return await sendEventEmail({
      event,
      to: inscripcion.email,
      subject: `¡Inscripción confirmada! — ${event.name}`,
      html: correoConfirmadaHtml(event, inscripcion.nombre, inscripcion.dorsal),
      attachments: [{ filename: "inscripcion-definitiva.pdf", content: pdf }],
    });
  } catch (error) {
    console.error(`Correo 2 falló para la inscripción ${inscripcion.id}:`, error);
    return { sent: false };
  }
}
