/**
 * Datos de contacto de EB Corp: lo único que es igual en los dos sitios.
 *
 * Lo que pertenece a un evento (correo del club, WhatsApp, redes) NO va aquí:
 * vive en `content/events/<slug>/config.ts`, que es el config por sitio.
 * Aquí solo lo corporativo, para no repetirlo en cada landing.
 */
export const EB_CORP = {
  nombre: "EB Corp",
  /** Contacto general de la empresa (desarrollo del sitio, temas comerciales) */
  email: "contacto@ebcorp.dev",
  /**
   * Buzón de inscripciones de los dos eventos. Es TAMBIÉN el remitente de los
   * correos automáticos (lib/email.ts lo usa como `from`), así que cambiarlo
   * aquí cambia las dos cosas a la vez.
   *
   * Ojo: la dirección debe pertenecer a un dominio verificado en Resend, o
   * los envíos fallarán con un error de dominio no verificado.
   */
  inscripciones: "inscripciones@ebcorp.dev",
} as const;
