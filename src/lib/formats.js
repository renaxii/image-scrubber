export { detectFormat, formatLabel } from "../core/detect.js";
import { detectFormat } from "../core/detect.js";
import { stripJpegMetadata } from "../formats/jpeg.js";
import { stripPngMetadata } from "../formats/png.js";
import { stripWebpMetadata } from "../formats/webp.js";

export function stripMetadata(bytes, format = detectFormat(bytes)) {
  const handler = { jpeg: stripJpegMetadata, png: stripPngMetadata, webp: stripWebpMetadata }[format];
  if (!handler) throw new Error("Unsupported format.");
  return handler(bytes).bytes;
}
