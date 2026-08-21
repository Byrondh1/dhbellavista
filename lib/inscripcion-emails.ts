import QRCode from "qrcode";
import type { EventConfig } from "./types";
import type { InscripcionRow } from "./inscripciones";
import {
  avisoOrganizadorHtml,
  correoConfirmadaHtml,
  correoRechazoHtml,
  correoPresencialHtml,
  correoRecibidaHtml,
  sendEventEmail,
  type EmailResult,
} from "./email";
import { renderInscripcionPdf, type PdfInscripcion } from "./pdf/inscripcion-pdf";
import { identificadorDe, referenciaDe } from "./identificador";
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
    placa: row.placa,
    copiloto: row.copiloto,
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
  /**
   * Presente = el pago se cobra en efectivo el día del evento, así que el
   * correo no puede decir "tu pago fue verificado". El monto es opcional:
   * el aviso vale igual sin la cifra.
   */
  pagoEnSitio?: { monto?: string | null },
): Promise<EmailResult> {
  const datos = validarDatos(inscripcion);
  if (!datos.ok) {
    logError(`Correo 2 omitido (${inscripcion.id}): ${datos.reason}`, inscripcion);
    return { sent: false, reason: datos.reason };
  }

  const referencia = referenciaDe(event, inscripcion);

  // El QR es deseable pero no bloqueante: su fallo no debe impedir el correo
  let qrDataUrl: string | undefined;
  try {
    if (!referencia) {
      logWarn(
        `Correo 2 (${inscripcion.id}): sin identificador (${identificadorDe(event).label}), ` +
          `el PDF sale sin QR de check-in.`,
      );
    } else {
      const token = signCheckinToken({
        id: inscripcion.id,
        slug: event.slug,
        ref: referencia.value,
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
      // El PDF lleva el mismo aviso que el correo: en la acreditación se
      // enseña el documento, no el mensaje que lo trajo.
      pagoEnSitio,
    );
    logInfo(`Correo 2: PDF listo (${pdf.length} bytes)`);
    return await sendEventEmail({
      event,
      to: inscripcion.email,
      subject: `¡Inscripción confirmada! — ${event.name}`,
      html: correoConfirmadaHtml(
        event,
        inscripcion.nombre,
        referencia,
        pagoEnSitio,
      ),
      attachments: [{ filename: "inscripcion-definitiva.pdf", content: pdf }],
    });
  } catch (error) {
    const reason = `pdf-error: ${describeError(error)}`;
    logError(`Correo 2 falló para la inscripción ${inscripcion.id}`, error);
    return { sent: false, reason };
  }
}

/**
 * Correo de rechazo: "revisa tu inscripción". Sin PDF adjunto — el objetivo
 * es que la persona corrija y vuelva, no entregarle un documento. El motivo
 * lo escribe el admin en el panel y se le muestra tal cual. Nunca lanza.
 */
export async function enviarCorreoRechazo(
  event: EventConfig,
  inscripcion: InscripcionParaCorreo,
  motivo: string | null | undefined,
): Promise<EmailResult> {
  const datos = validarDatos(inscripcion);
  if (!datos.ok) {
    logError(
      `Correo de rechazo omitido (${inscripcion.id}): ${datos.reason}`,
      inscripcion,
    );
    return { sent: false, reason: datos.reason };
  }

  if (!motivo) {
    logWarn(
      `Correo de rechazo (${inscripcion.id}): sin motivo, se envía el texto genérico.`,
    );
  }

  logInfo(`Correo de rechazo: enviando a ${inscripcion.email} (${inscripcion.id})`);
  return await sendEventEmail({
    event,
    to: inscripcion.email,
    subject: `Revisa tu inscripción — ${event.name}`,
    html: correoRechazoHtml(event, inscripcion.nombre, motivo),
  });
}

/**
 * Aviso interno al club: entró una inscripción nueva.
 *
 * Va al correo del club (`sections.contact.email`), nunca a una dirección
 * escrita a mano: cada evento avisa al suyo. El reply-to es el participante,
 * para poder responderle desde el propio aviso.
 *
 * Es el correo prescindible del módulo: si falla, la inscripción está igual
 * en el panel. Por eso no guarda timestamp ni se puede reenviar — a
 * diferencia de los correos al participante, que sí son su constancia.
 * Nunca lanza.
 */
export async function enviarAvisoOrganizador(
  event: EventConfig,
  inscripcion: InscripcionParaCorreo,
): Promise<EmailResult> {
  if (event.registrationForm?.notificarOrganizador === false) {
    const reason = "desactivado: registrationForm.notificarOrganizador";
    logInfo(`Aviso al organizador omitido (${inscripcion.id}): ${reason}`);
    return { sent: false, reason };
  }

  const destino = event.sections.contact?.email;
  if (!destino) {
    const reason = "sin-destinatario: sections.contact.email no está definido";
    logWarn(
      `Aviso al organizador omitido (${inscripcion.id}): ${reason}. ` +
        `Defínelo en el config de ${event.slug} para recibir estos avisos.`,
    );
    return { sent: false, reason };
  }

  const datos = validarDatos(inscripcion);
  if (!datos.ok) {
    logError(
      `Aviso al organizador omitido (${inscripcion.id}): ${datos.reason}`,
      inscripcion,
    );
    return { sent: false, reason: datos.reason };
  }

  // El id de la categoría no le dice nada a nadie: se muestra su nombre
  const categoria = inscripcion.categoria
    ? (event.categories.find((c) => c.id === inscripcion.categoria)?.name ??
      inscripcion.categoria)
    : null;

  const fichaUrl = `${getSiteUrl(event)}/admin/inscripciones/${inscripcion.id}`;

  logInfo(`Aviso al organizador: enviando a ${destino} (${inscripcion.id})`);
  return await sendEventEmail({
    event,
    to: destino,
    // Responder al aviso le escribe al participante, no al propio club
    replyTo: inscripcion.email,
    subject: `Nueva inscripción — ${event.name}: ${inscripcion.nombre}`,
    html: avisoOrganizadorHtml(
      event,
      {
        nombre: inscripcion.nombre,
        ciudad: inscripcion.ciudad,
        telefono: inscripcion.telefono,
        identificador: referenciaDe(event, inscripcion),
        categoria,
        copiloto: inscripcion.copiloto,
      },
      fichaUrl,
    ),
  });
}

/**
 * Correo del alta presencial: pagó en efectivo en el mostrador y se va con su
 * dorsal en la mano. Lleva el PDF definitivo con QR, igual que el Correo 2,
 * pero con un texto que dice la verdad sobre cómo pagó. Nunca lanza.
 */
export async function enviarCorreoPresencial(
  event: EventConfig,
  inscripcion: InscripcionParaCorreo,
  categoria: string | null,
): Promise<EmailResult> {
  const datos = validarDatos(inscripcion);
  if (!datos.ok) {
    logError(
      `Correo presencial omitido (${inscripcion.id}): ${datos.reason}`,
      inscripcion,
    );
    return { sent: false, reason: datos.reason };
  }

  const referencia = referenciaDe(event, inscripcion);

  // El QR es deseable pero no bloqueante, igual que en el Correo 2: en el
  // mostrador lo que importa es que el corredor se lleve su número.
  let qrDataUrl: string | undefined;
  try {
    if (referencia) {
      const token = signCheckinToken({
        id: inscripcion.id,
        slug: event.slug,
        ref: referencia.value,
      });
      if (token) {
        qrDataUrl = await QRCode.toDataURL(
          `${getSiteUrl(event)}/admin/checkin?t=${token}`,
          { margin: 1, width: 480, errorCorrectionLevel: "M" },
        );
      } else {
        logWarn(`Presencial (${inscripcion.id}): QR omitido, falta QR_SECRET.`);
      }
    }
  } catch (error) {
    logError(`Presencial (${inscripcion.id}): fallo generando el QR`, error);
  }

  try {
    const pdf = await renderInscripcionPdf(
      event,
      inscripcion,
      "definitivo",
      qrDataUrl,
    );
    logInfo(`Presencial: PDF listo (${pdf.length} bytes) para ${inscripcion.id}`);
    return await sendEventEmail({
      event,
      to: inscripcion.email,
      subject: `Inscripción confirmada — ${event.name}`,
      html: correoPresencialHtml(
        event,
        inscripcion.nombre,
        referencia?.value ?? "—",
        categoria,
      ),
      attachments: [{ filename: "inscripcion.pdf", content: pdf }],
    });
  } catch (error) {
    const reason = `pdf-error: ${describeError(error)}`;
    logError(`Correo presencial falló para ${inscripcion.id}`, error);
    return { sent: false, reason };
  }
}
