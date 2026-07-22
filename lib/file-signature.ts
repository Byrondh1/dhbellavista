/**
 * Verifica que los primeros bytes del archivo correspondan al tipo MIME
 * declarado (evita, por ejemplo, un ejecutable renombrado a .png).
 */
export function matchesSignature(bytes: Uint8Array, mime: string): boolean {
  switch (mime) {
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
    case "image/webp":
      // "RIFF" .... "WEBP"
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes.length >= 12 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    case "application/pdf":
      // "%PDF"
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
    default:
      return false;
  }
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return (
    bytes.length >= signature.length &&
    signature.every((byte, i) => bytes[i] === byte)
  );
}
