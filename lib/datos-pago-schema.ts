import { z } from "zod";

/**
 * Validación de los datos bancarios editables desde el panel. Compartida
 * por el formulario (cliente) y el endpoint (servidor).
 */
export const datosPagoSchema = z.object({
  activo: z.boolean(),
  banco: z.string().trim().min(2, "Indica el banco").max(80),
  tipoCuenta: z
    .string()
    .trim()
    .min(2, "Indica el tipo de cuenta (Ahorros, Corriente…)")
    .max(40),
  numeroCuenta: z
    .string()
    .trim()
    .regex(
      /^[\d-]{5,30}$/,
      "El número de cuenta solo puede tener dígitos y guiones",
    ),
  titular: z.string().trim().min(3, "Indica el titular de la cuenta").max(120),
  identificacionTitular: z
    .string()
    .trim()
    .regex(
      /^\d{10}$|^\d{13}$/,
      "La identificación del titular debe tener 10 dígitos (cédula) o 13 (RUC)",
    ),
  monto: z.string().trim().min(1, "Indica el monto de la inscripción").max(80),
  intro: z.string().trim().max(300).optional().or(z.literal("")),
  notas: z
    .array(z.string().trim().min(1).max(200))
    .max(5, "Máximo 5 notas")
    .default([]),
});

export type DatosPagoInput = z.infer<typeof datosPagoSchema>;
