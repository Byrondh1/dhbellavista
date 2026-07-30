import { z } from "zod";
import type { EventConfig } from "./types";

/** Tipos de archivo aceptados como comprobante de transferencia */
export const COMPROBANTE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const COMPROBANTE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Texto de consentimiento (Ley Orgánica de Protección de Datos Personales,
 * Ecuador). Se guarda junto a cada inscripción como evidencia de la versión
 * aceptada. Un evento puede sobreescribirlo vía registrationForm.consentText.
 */
export const DEFAULT_CONSENT_TEXT =
  "Autorizo al club organizador el tratamiento de mis datos personales con la única finalidad de gestionar mi inscripción y la logística del evento. Mis datos no serán cedidos a terceros y puedo ejercer mis derechos de acceso, rectificación y eliminación contactando al organizador.";

const trimmed = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max, msg);

/**
 * Campo que este evento no usa: no puede traer valor, pero tampoco hace falta
 * que la clave exista. `z.undefined()` a secas exigiría la clave presente en
 * zod 4, y un payload sin ella fallaría con un mensaje incomprensible.
 */
const desactivado = z.undefined().optional();

/**
 * Normaliza una placa: mayúsculas y fuera espacios, puntos y guiones bajos.
 * Se conserva el guión porque es como se escriben aquí (PCX-1234), pero se
 * compara sin depender de él.
 */
export function normalizarPlaca(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[\s._]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Placa válida: 5–10 alfanuméricos (más guión opcional) con al menos una
 * letra y un número. A propósito permisiva: además de las ecuatorianas
 * (PCX-1234) entran las colombianas de auto (ABC123) y de moto (ABC12D) —
 * Ipiales está a 40 km y esa gente participa. Rebotar una placa válida a las
 * 10 de la noche cuesta más que aceptar una rara.
 */
export function placaValida(placa: string): boolean {
  return (
    /^[A-Z0-9]+(-[A-Z0-9]+)?$/.test(placa) &&
    placa.replace(/-/g, "").length >= 5 &&
    placa.replace(/-/g, "").length <= 10 &&
    /[A-Z]/.test(placa) &&
    /\d/.test(placa)
  );
}

export const PLACA_MENSAJE =
  "Ingresa la placa del vehículo (5 a 10 caracteres, con letras y números; ej. PCX-1234)";

/**
 * Esquema de validación del formulario de inscripción, construido según los
 * campos activos en el config del evento y sus categorías reales.
 */
export function buildRegistrationSchema(event: EventConfig) {
  const fields = event.registrationForm?.fields;
  // El enum solo se construye si el evento clasifica: `z.enum([])` no es
  // válido, y un evento sin categorías (rodada) no debe siquiera poder
  // recibir el campo.
  const clasifica = fields?.categoria !== false && event.categories.length > 0;
  const categoryIds = event.categories.map((c) => c.id) as [string, ...string[]];

  return z.object({
    nombre: trimmed(3, 120, "Ingresa tu nombre completo"),
    // Necesario para los correos de confirmación y el PDF de inscripción
    email: z.email("Ingresa un correo válido").max(160),
    categoria: clasifica
      ? z.enum(categoryIds, "Selecciona una categoría válida")
      : desactivado,
    // La placa identifica la inscripción: se guarda normalizada
    placa: fields?.placa
      ? // El mensaje va también en z.string(): si el campo no llega, el error
        // por defecto de zod ("expected string, received undefined") no le
        // dice nada a quien está llenando el formulario.
        z
          .string(PLACA_MENSAJE)
          .trim()
          .transform(normalizarPlaca)
          .refine(placaValida, PLACA_MENSAJE)
      : desactivado,
    // Opcional para el usuario: lleno = kit para dos
    copiloto: fields?.copiloto
      ? trimmed(3, 120, "El nombre del copiloto es muy corto")
          .optional()
          .or(z.literal(""))
      : desactivado,
    telefono: z
      .string()
      .trim()
      .regex(/^\+?\d{7,15}$/, "Ingresa un teléfono válido (solo números)"),
    cedula: fields?.cedula
      ? z.string().trim().regex(/^\d{10}$/, "La cédula debe tener 10 dígitos")
      : desactivado,
    ciudad: fields?.ciudad
      ? trimmed(2, 80, "Ingresa tu ciudad")
      : desactivado,
    emergenciaNombre: fields?.emergencyContact
      ? trimmed(3, 120, "Ingresa el nombre del contacto de emergencia")
      : desactivado,
    emergenciaTelefono: fields?.emergencyContact
      ? z
          .string()
          .trim()
          .regex(/^\+?\d{7,15}$/, "Teléfono de emergencia inválido")
      : desactivado,
    // Club/equipo: siempre opcional para el usuario aunque el campo esté activo
    club: z.string().trim().max(120).optional().or(z.literal("")),
    // Checkbox LOPDP: el navegador envía "on" cuando está marcado
    consentimiento: z.literal(
      "on",
      "Debes aceptar el tratamiento de tus datos personales para inscribirte",
    ),
  });
}

export type RegistrationInput = z.infer<
  ReturnType<typeof buildRegistrationSchema>
>;
