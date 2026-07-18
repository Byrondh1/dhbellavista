import { ImageResponse } from "next/og";
import { getActiveEvent } from "@/lib/event";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon generado en build: inicial del evento sobre su color primario */
export default function Icon() {
  const event = getActiveEvent();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: event.theme.colors.primary,
          color: event.theme.colors.primaryContrast,
          fontSize: 44,
          fontWeight: 700,
          borderRadius: 12,
        }}
      >
        {event.name.charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
