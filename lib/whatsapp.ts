/** Construye un link wa.me con mensaje pre-llenado */
export function waLink(phone: string, message?: string): string {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * El número tal como se marca desde cualquier país: `tel:+593961699925`.
 * En el config se guarda sin el "+" (formato de wa.me), pero un enlace tel:
 * sin él se interpreta como número local y no sale del país.
 */
export function telLink(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}

/**
 * El número para leerlo en pantalla: "+593 96 169 9925".
 *
 * Se muestra en formato internacional a propósito: El Ángel está en la
 * frontera y parte del público entra desde Colombia, donde el 09… local no
 * sirve. Solo se agrupa el celular ecuatoriano (593 + 9 dígitos); cualquier
 * otra longitud se devuelve con el "+" y sin inventar separaciones.
 */
export function telefonoVisible(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const m = d.match(/^593(\d{2})(\d{3})(\d{4})$/);
  return m ? `+593 ${m[1]} ${m[2]} ${m[3]}` : `+${d}`;
}
