import { Resend } from "resend";
import type { EventConfig } from "./types";
import { describeError, logError, logInfo } from "./logger";

/** Resultado de un envío: `reason` explica el fallo en lenguaje accionable */
export interface EmailResult {
  sent: boolean;
  reason?: string;
}

/**
 * Envío de correos del módulo de inscripciones (Resend).
 *
 * Contrato: NUNCA lanza. Devuelve { sent, reason } y loguea cada etapa —
 * un fallo de correo jamás debe decidir el destino de una inscripción, pero
 * tampoco debe ser invisible.
 *
 * Por evento: el nombre visible del remitente es el nombre del evento
 * (la dirección es común, EMAIL_FROM_ADDRESS del dominio de EB Corp) y el
 * reply-to es el correo del organizador si el config lo define.
 *
 * EMAIL_TEST_REDIRECT: si está definida, TODO correo se desvía a esa
 * dirección y el destinatario original se antepone al asunto — para probar
 * sin escribirle a participantes reales.
 */
export async function sendEventEmail({
  event,
  to,
  subject,
  html,
  attachments,
}: {
  event: EventConfig;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

  const faltantes = [
    !apiKey && "RESEND_API_KEY",
    !fromAddress && "EMAIL_FROM_ADDRESS",
  ].filter(Boolean);
  if (faltantes.length > 0) {
    const reason = `env-missing: ${faltantes.join(", ")}`;
    logError(`Correo NO enviado a ${to}: falta configuración (${reason})`);
    return { sent: false, reason };
  }

  const redirect = process.env.EMAIL_TEST_REDIRECT;
  const destino = redirect ?? to;
  const replyTo = event.sections.contact?.email;

  try {
    logInfo(
      `Enviando correo → ${destino}${redirect ? ` (redirigido de ${to})` : ""} · "${subject}"`,
    );
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `${event.name} <${fromAddress}>`,
      to: destino,
      subject: redirect ? `[TEST → ${to}] ${subject}` : subject,
      html,
      ...(replyTo && { replyTo }),
      ...(attachments && {
        attachments: attachments.map(({ filename, content }) => ({
          filename,
          content,
        })),
      }),
    });
    if (error) {
      const reason = `resend-error: ${describeError(error)}`;
      logError(`Resend rechazó el correo a ${destino}`, error);
      return { sent: false, reason };
    }
    logInfo(`Correo aceptado por Resend (id ${data?.id ?? "sin id"})`);
    return { sent: true };
  } catch (error) {
    const reason = `resend-exception: ${describeError(error)}`;
    logError(`Excepción enviando correo a ${destino}`, error);
    return { sent: false, reason };
  }
}

/** Estilos inline compartidos por los cuerpos de correo (branding del evento) */
function emailShell(event: EventConfig, body: string): string {
  const { primary, primaryContrast } = event.theme.colors;
  return `
<div style="margin:0 auto;max-width:560px;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a">
  <div style="background:${primary};color:${primaryContrast};padding:20px 24px">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase">${event.club.name}</p>
    <h1 style="margin:4px 0 0;font-size:22px;text-transform:uppercase">${event.name}</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:0">
    ${body}
    <p style="margin-top:28px;font-size:12px;color:#777">
      ${event.date.displayLabel} · ${event.location.venue}, ${event.location.city}.
      Si tienes dudas, responde a este correo o escríbenos por WhatsApp.
    </p>
  </div>
</div>`;
}

/** Correo 1: inscripción recibida, pago pendiente de verificación */
export function correoRecibidaHtml(event: EventConfig, nombre: string): string {
  return emailShell(
    event,
    `
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Recibimos tu inscripción al <strong>${event.name}</strong>. 🎉</p>
    <p>Tu pago está <strong>pendiente de verificación</strong>: la organización
    revisará el comprobante y, al confirmarlo, te llegará un segundo correo
    con tu <strong>inscripción definitiva y tu dorsal</strong>.</p>
    <p>Adjuntamos tu comprobante de inscripción provisional en PDF.</p>`,
  );
}

/** Correo 2: inscripción confirmada, con dorsal y PDF definitivo con QR */
export function correoConfirmadaHtml(
  event: EventConfig,
  nombre: string,
  dorsal: number | null | undefined,
): string {
  const { primary } = event.theme.colors;
  return emailShell(
    event,
    `
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>¡Tu pago fue verificado y tu inscripción al
    <strong>${event.name}</strong> está <strong>confirmada</strong>! 🏁</p>
    ${
      dorsal != null
        ? `<p style="margin:20px 0">Tu dorsal es:</p>
           <p style="margin:0 0 20px;font-size:48px;font-weight:bold;color:${primary};border:2px solid ${primary};display:inline-block;padding:8px 28px;border-radius:4px">${dorsal}</p>`
        : ""
    }
    <p>Adjuntamos tu <strong>inscripción definitiva en PDF</strong> con tu
    código QR: preséntalo (impreso o en tu celular) en la acreditación del
    día del evento.</p>
    <p>¡Nos vemos en la pista!</p>`,
  );
}
