import QRCode from "qrcode";
import type { EventConfig } from "./types";
import type { InscripcionRow } from "./inscripciones";
import {
  correoConfirmadaHtml,
  correoRecibidaHtml,
  sendEventEmail,
  type EmailResult,
} from "./email";
import { renderInscripcionPdf, type PdfInscripcion } from "./pdf/inscripcion-pdf";
import { signCheckinToken } from "./qr-token";
import { getSiteUrl } from "./site-url";
import { describeError, logError, logInfo, logWarn } from "./logger";

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

/** Los correos necesitan al menos id, nombre y email para tener sentido */
function validarDatos(
  inscripcion: InscripcionParaCorreo,
): { ok: true } | { ok: false; reason: string } {
  const faltantes = [
    !inscripcion.id && "id",
    !inscripcion.nombre && "nombre",
    !inscripcion.email && "email",
  ].filter(Boolean);
  return faltantes.length === 0
    ? { ok: true }
    : { ok: false, reason: `datos-incompletos: falta ${faltantes.join(", ")}` };
}

/** Correo 1: inscripción recibida + PDF provisional. Nunca lanza. */
export async function enviarCorreoRecibida(
  event: EventConfig,
  inscripcion: InscripcionParaCorreo,
): Promise<EmailResult> {
  const datos = validarDatos(inscripcion);
  if (!datos.ok) {
    logError(`Correo 1 omitido (${inscripcion.id}): ${datos.reason}`, inscripcion);
    return { sent: false, reason: datos.reason };
  }

  try {
    logInfo(`Correo 1: generando PDF provisional para ${inscripcion.id}`);
    const pdf = await renderInscripcionPdf(event, inscripcion, "provisional");
    logInfo(`Correo 1: PDF listo (${pdf.length} bytes)`);
    return await sendEventEmail({
      event,
      to: inscripcion.email,
      subject: `Inscripción recibida — ${event.name}`,
      html: correoRecibidaHtml(event, inscripcion.nombre),
      attachments: [{ filename: "inscripcion-provisional.pdf", content: pdf }],
    });
  } catch (error) {
    const reason = `pdf-error: ${describeError(error)}`;
    logError(`Correo 1 falló para la inscripción ${inscripcion.id}`, error);
    return { sent: false, reason };
  }
}

/**
 * Correo 2: inscripción confirmada + PDF definitivo con dorsal y QR firmado
 * de check-in. Si QR_SECRET no está configurado, el PDF sale sin QR (queda
 * registrado) — el correo no se bloquea por eso. Nunca lanza.
 */
export async function enviarCorreoConfirmada(
  event: EventConfig,
  inscripcion: InscripcionParaCorreo,
): Promise<EmailResult> {
  const datos = validarDatos(inscripcion);
  if (!datos.ok) {
    logError(`Correo 2 omitido (${inscripcion.id}): ${datos.reason}`, inscripcion);
    return { sent: false, reason: datos.reason };
  }

  // El QR es deseable pero no bloqueante: su fallo no debe impedir el correo
  let qrDataUrl: string | undefined;
  try {
    if (inscripcion.dorsal == null) {
      logWarn(
        `Correo 2 (${inscripcion.id}): sin dorsal, el PDF sale sin QR de check-in.`,
      );
    } else {
      const token = signCheckinToken({
        id: inscripcion.id,
        slug: event.slug,
        dorsal: inscripcion.dorsal,
      });
      if (!token) {
        logWarn(
          `Correo 2 (${inscripcion.id}): QR omitido, falta QR_SECRET en el entorno.`,
        );
      } else {
        const checkinUrl = `${getSiteUrl(event)}/admin/checkin?t=${token}`;
        qrDataUrl = await QRCode.toDataURL(checkinUrl, {
          margin: 1,
          width: 480,
          errorCorrectionLevel: "M",
        });
        logInfo(
          `Correo 2 (${inscripcion.id}): QR generado (${qrDataUrl.length} chars) → ${checkinUrl.slice(0, 60)}…`,
        );
      }
    }
  } catch (error) {
    logError(
      `Correo 2 (${inscripcion.id}): fallo generando el QR; se continúa sin QR`,
      error,
    );
  }

  try {
    logInfo(`Correo 2: generando PDF definitivo para ${inscripcion.id}`);
    const pdf = await renderInscripcionPdf(
      event,
      inscripcion,
      "definitivo",
      qrDataUrl,
    );
    logInfo(`Correo 2: PDF listo (${pdf.length} bytes)`);
    return await sendEventEmail({
      event,
      to: inscripcion.email,
      subject: `¡Inscripción confirmada! — ${event.name}`,
      html: correoConfirmadaHtml(event, inscripcion.nombre, inscripcion.dorsal),
      attachments: [{ filename: "inscripcion-definitiva.pdf", content: pdf }],
    });
  } catch (error) {
    const reason = `pdf-error: ${describeError(error)}`;
    logError(`Correo 2 falló para la inscripción ${inscripcion.id}`, error);
    return { sent: false, reason };
  }
}
