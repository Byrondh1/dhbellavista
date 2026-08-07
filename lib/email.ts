import { Resend } from "resend";
import type { EventConfig } from "./types";
import { EB_CORP } from "./ebcorp";
import { identificadorDe } from "./identificador";
import { waLink } from "./whatsapp";
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
 * (la dirección es común, EB_CORP.inscripciones) y el
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
  replyTo: replyToOverride,
}: {
  event: EventConfig;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
  /**
   * Sustituye el reply-to por defecto (el correo del club). Lo usa el aviso
   * al organizador, donde el club es el destinatario y responder debe
   * escribirle al participante.
   */
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  // El remitente NO es variable de entorno: es la misma dirección en local y
  // en producción (lo que cambia por entorno es EMAIL_TEST_REDIRECT, que
  // afecta al destinatario). Tenerlo en código evita un modo de fallo real:
  // desplegar con la variable ausente y quedarse sin correos.
  const fromAddress = EB_CORP.inscripciones;

  if (!apiKey) {
    const reason = "env-missing: RESEND_API_KEY";
    logError(`Correo NO enviado a ${to}: falta configuración (${reason})`);
    return { sent: false, reason };
  }

  const redirect = process.env.EMAIL_TEST_REDIRECT;
  const destino = redirect ?? to;
  const replyTo = replyToOverride ?? event.sections.contact?.email;

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

/**
 * Escapa texto que escribió otra persona antes de meterlo en el HTML.
 *
 * Importa sobre todo en el aviso al organizador: ahí van varios campos del
 * formulario dentro de un correo que el club abre y en el que hace clic. Sin
 * esto, alguien podría escribir marcado en su nombre o su ciudad y colar un
 * enlace de aspecto legítimo en un correo que la organización se cree.
 */
function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  // Prometer un dorsal a quien se identifica por placa sería mentirle
  const queRecibira =
    identificadorDe(event).tipo === "dorsal"
      ? "tu <strong>inscripción definitiva y tu dorsal</strong>"
      : "tu <strong>inscripción definitiva</strong> con el código QR de acreditación";
  return emailShell(
    event,
    `
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Recibimos tu inscripción al <strong>${event.name}</strong>. 🎉</p>
    <p>Tu pago está <strong>pendiente de verificación</strong>: la organización
    revisará el comprobante y, al confirmarlo, te llegará un segundo correo
    con ${queRecibira}.</p>
    <p>Adjuntamos tu comprobante de inscripción provisional en PDF.</p>`,
  );
}

/**
 * Correo 2: inscripción confirmada, con el identificador del evento (dorsal o
 * placa) y el PDF definitivo con QR.
 */
export function correoConfirmadaHtml(
  event: EventConfig,
  nombre: string,
  referencia: { label: string; value: string } | null,
): string {
  const { primary } = event.theme.colors;
  return emailShell(
    event,
    `
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>¡Tu pago fue verificado y tu inscripción al
    <strong>${event.name}</strong> está <strong>confirmada</strong>! 🏁</p>
    ${
      referencia
        ? `<p style="margin:20px 0">Tu ${referencia.label.toLowerCase()}:</p>
           <p style="margin:0 0 20px;font-size:40px;font-weight:bold;color:${primary};border:2px solid ${primary};display:inline-block;padding:8px 28px;border-radius:4px">${referencia.value}</p>`
        : ""
    }
    <p>Adjuntamos tu <strong>inscripción definitiva en PDF</strong> con tu
    código QR: preséntalo (impreso o en tu celular) en la acreditación del
    día del evento.</p>
    <p>¡Nos vemos en la pista!</p>`,
  );
}

/**
 * Correo de rechazo, en tono de ACCIÓN REQUERIDA — no de puerta cerrada.
 * La mayoría de rechazos son corregibles (comprobante borroso, monto que no
 * cuadra, captura equivocada), así que el correo explica qué pasó, muestra
 * el motivo que escribió la organización e invita a corregir por WhatsApp.
 */
export function correoRechazoHtml(
  event: EventConfig,
  nombre: string,
  motivo: string | null | undefined,
): string {
  const { primary, primaryContrast } = event.theme.colors;
  const whatsappHref = waLink(
    event.whatsapp.phone,
    `Hola, quiero corregir mi inscripción al ${event.name}. Mi nombre es: ${nombre}`,
  );

  return emailShell(
    event,
    `
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Revisamos tu inscripción al <strong>${event.name}</strong> y
    <strong>todavía no pudimos verificar tu pago</strong>. Tu cupo no está
    perdido: en la mayoría de los casos se resuelve reenviando el
    comprobante correcto.</p>
    ${
      motivo
        ? `<div style="margin:20px 0;padding:16px;border-left:4px solid ${primary};background:#f7f7f7">
             <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#666">Qué necesitamos</p>
             <p style="margin:0"><strong>${motivo}</strong></p>
           </div>`
        : `<p style="margin:20px 0"><strong>Escríbenos y te indicamos qué
             falta para completar tu inscripción.</strong></p>`
    }
    <p>Escríbenos por WhatsApp con el comprobante corregido y lo revisamos
    enseguida:</p>
    <p style="margin:20px 0">
      <a href="${whatsappHref}"
         style="display:inline-block;background:${primary};color:${primaryContrast};text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:14px 28px;border-radius:4px">
        Corregir mi inscripción
      </a>
    </p>
    <p style="font-size:13px;color:#666">Si crees que se trata de un error,
    responde a este correo y lo revisamos.</p>`,
  );
}

/** Una fila etiqueta/valor del aviso; se omite cuando no hay dato */
function filaDato(label: string, valor: string | null | undefined): string {
  if (!valor?.trim()) return "";
  return `
    <tr>
      <td style="padding:6px 12px 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:15px"><strong>${escapeHtml(valor.trim())}</strong></td>
    </tr>`;
}

/**
 * Aviso interno al club: entró una inscripción nueva.
 *
 * Deliberadamente SIN cédula. El correo no viaja cifrado de punta a punta y
 * queda copiado en el buzón de quien lo reciba; la cédula es justo el dato
 * que hay que cuidar. Quien necesite verla entra al panel, donde está detrás
 * de la sesión y de la RLS. Por eso el cuerpo lleva lo justo para decidir si
 * vale la pena entrar, y un enlace directo a la ficha.
 */
export function avisoOrganizadorHtml(
  event: EventConfig,
  datos: {
    nombre: string;
    ciudad?: string | null;
    telefono?: string | null;
    identificador?: { label: string; value: string } | null;
    categoria?: string | null;
  },
  fichaUrl: string,
): string {
  const { primary, primaryContrast } = event.theme.colors;

  return emailShell(
    event,
    `
    <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#666">Inscripción nueva</p>
    <p style="margin:0 0 20px;font-size:20px"><strong>${escapeHtml(datos.nombre)}</strong></p>

    <table style="border-collapse:collapse;width:100%">
      ${filaDato("Ciudad", datos.ciudad)}
      ${filaDato("Teléfono", datos.telefono)}
      ${datos.identificador ? filaDato(datos.identificador.label, datos.identificador.value) : ""}
      ${filaDato("Categoría", datos.categoria)}
    </table>

    <p style="margin:24px 0 8px">El pago está <strong>pendiente de
    verificación</strong>. Revisa el comprobante en el panel:</p>
    <p style="margin:0 0 20px">
      <a href="${fichaUrl}"
         style="display:inline-block;background:${primary};color:${primaryContrast};text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:14px 28px;border-radius:4px">
        Ver la inscripción
      </a>
    </p>
    <p style="font-size:13px;color:#666">La cédula y el comprobante no van en
    este correo: están en el panel, protegidos por tu sesión. Si respondes a
    este mensaje le escribes directamente al participante.</p>`,
  );
}
