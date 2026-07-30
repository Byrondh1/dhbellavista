import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { EventConfig } from "@/lib/types";
import { identificadorDe, referenciaDe, usaCategorias } from "@/lib/identificador";

/** Datos del inscrito que aparecen en el PDF (subset serializable) */
export interface PdfInscripcion {
  id: string;
  nombre: string;
  cedula?: string | null;
  /** null en eventos que no clasifican */
  categoria?: string | null;
  ciudad?: string | null;
  telefono: string;
  club?: string | null;
  dorsal?: number | null;
  placa?: string | null;
  copiloto?: string | null;
  created_at: string;
}

export type PdfVariant = "provisional" | "definitivo";

/**
 * Comprobante de inscripción en PDF, con la marca del evento tomada del
 * config (banda de color primario; cuerpo en negro sobre blanco para que
 * imprima bien). Variantes:
 * - provisional: sello "PENDIENTE DE VERIFICACIÓN" (Correo 1)
 * - definitivo: identificador en grande (dorsal o placa, según el config del
 *   evento) + QR de check-in (Correo 2)
 */
export async function renderInscripcionPdf(
  event: EventConfig,
  inscripcion: PdfInscripcion,
  variant: PdfVariant,
  qrDataUrl?: string,
): Promise<Buffer> {
  const { primary, primaryContrast } = event.theme.colors;

  const styles = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 11, color: "#111" },
    header: {
      backgroundColor: primary,
      color: primaryContrast,
      padding: 24,
    },
    club: {
      fontSize: 9,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    eventName: {
      fontSize: 20,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
    },
    body: { padding: 24 },
    stamp: {
      alignSelf: "flex-start",
      borderWidth: 2,
      borderColor: variant === "provisional" ? "#b45309" : primary,
      color: variant === "provisional" ? "#b45309" : primary,
      fontFamily: "Helvetica-Bold",
      fontSize: 12,
      textTransform: "uppercase",
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginBottom: 16,
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e5e5e5",
      paddingVertical: 6,
    },
    label: {
      width: 150,
      color: "#666",
      textTransform: "uppercase",
      fontSize: 8,
      letterSpacing: 1,
      paddingTop: 2,
    },
    value: { flex: 1, fontFamily: "Helvetica-Bold" },
    dorsalBlock: {
      marginTop: 20,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dorsal: {
      fontSize: 64,
      fontFamily: "Helvetica-Bold",
      color: primary,
    },
    /** Variante para identificadores de texto (placa): más chico y monoespaciado */
    placa: {
      fontSize: 32,
      fontFamily: "Courier-Bold",
      letterSpacing: 1,
    },
    qr: { width: 120, height: 120 },
    note: { marginTop: 20, fontSize: 9, color: "#666", lineHeight: 1.5 },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 24,
      right: 24,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8,
      color: "#999",
      borderTopWidth: 1,
      borderTopColor: "#e5e5e5",
      paddingTop: 8,
    },
  });

  const ident = identificadorDe(event);
  const referencia = referenciaDe(event, inscripcion);

  const categoryName = inscripcion.categoria
    ? (event.categories.find((c) => c.id === inscripcion.categoria)?.name ??
      inscripcion.categoria)
    : null;

  const fila = (label: string, value: string): [string, string] => [label, value];
  const fields: [string, string][] = [
    fila("Nombre", inscripcion.nombre),
    ...(inscripcion.cedula ? [fila("Cédula", inscripcion.cedula)] : []),
    // Solo en eventos que clasifican: si no, no queda una fila con guión
    ...(usaCategorias(event) && categoryName
      ? [fila("Categoría", categoryName)]
      : []),
    ...(inscripcion.ciudad ? [fila("Ciudad", inscripcion.ciudad)] : []),
    ...(inscripcion.placa ? [fila(ident.label, inscripcion.placa)] : []),
    ...(inscripcion.copiloto ? [fila("Copiloto", inscripcion.copiloto)] : []),
    fila("Teléfono", inscripcion.telefono),
    ...(inscripcion.club ? [fila("Club / equipo", inscripcion.club)] : []),
    fila(
      "Evento",
      `${event.date.displayLabel} — ${event.location.venue}, ${event.location.city}`,
    ),
  ];

  const doc = (
    <Document
      title={`Inscripción ${variant} — ${event.name}`}
      author={event.club.name}
    >
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.club}>{event.club.name}</Text>
          <Text style={styles.eventName}>{event.name}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.stamp}>
            {variant === "provisional"
              ? "Pendiente de verificación"
              : "Inscripción confirmada"}
          </Text>

          {fields.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}

          {variant === "definitivo" && (
            <View style={styles.dorsalBlock}>
              <View>
                <Text style={{ fontSize: 8, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>
                  {ident.label}
                </Text>
                <Text
                  style={[
                    styles.dorsal,
                    // Una placa tiene 7–8 caracteres: a 64 pt se sale del A5
                    ident.tipo === "placa" ? styles.placa : {},
                  ]}
                >
                  {referencia?.value ?? "—"}
                </Text>
              </View>
              {qrDataUrl && (
                // eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf (documento impreso), no <img> HTML
                <Image src={qrDataUrl} style={styles.qr} />
              )}
            </View>
          )}

          <Text style={styles.note}>
            {variant === "provisional"
              ? // No prometer un dorsal a quien se identifica por placa
                `Este documento no confirma tu cupo. Cuando la organización verifique tu pago recibirás por correo tu inscripción definitiva ${
                  ident.tipo === "dorsal"
                    ? "con dorsal y código QR"
                    : "con el código QR de acreditación"
                }.`
              : "Presenta este documento (impreso o en tu celular) en la acreditación del evento. El código QR es personal e intransferible."}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Inscripción {inscripcion.id.slice(0, 8).toUpperCase()}</Text>
          <Text>
            Emitido el{" "}
            {new Date(inscripcion.created_at).toLocaleDateString("es-EC", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>
      </Page>
    </Document>
  );

  return Buffer.from(await renderToBuffer(doc));
}
