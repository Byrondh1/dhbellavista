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
 * Esquema de validación del formulario de inscripción, construido según los
 * campos activos en el config del evento y sus categorías reales.
 */
export function buildRegistrationSchema(event: EventConfig) {
  const fields = event.registrationForm?.fields;
  const categoryIds = event.categories.map((c) => c.id) as [string, ...string[]];

  return z.object({
    nombre: trimmed(3, 120, "Ingresa tu nombre completo"),
    // Necesario para los correos de confirmación y el PDF de inscripción
    email: z.email("Ingresa un correo válido").max(160),
    categoria: z.enum(categoryIds, "Selecciona una categoría válida"),
    telefono: z
      .string()
      .trim()
      .regex(/^\+?\d{7,15}$/, "Ingresa un teléfono válido (solo números)"),
    cedula: fields?.cedula
      ? z.string().trim().regex(/^\d{10}$/, "La cédula debe tener 10 dígitos")
      : z.undefined(),
    ciudad: fields?.ciudad
      ? trimmed(2, 80, "Ingresa tu ciudad")
      : z.undefined(),
    emergenciaNombre: fields?.emergencyContact
      ? trimmed(3, 120, "Ingresa el nombre del contacto de emergencia")
      : z.undefined(),
    emergenciaTelefono: fields?.emergencyContact
      ? z
          .string()
          .trim()
          .regex(/^\+?\d{7,15}$/, "Teléfono de emergencia inválido")
      : z.undefined(),
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
