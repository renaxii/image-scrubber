import { stripJpegMetadata } from "../formats/jpeg.js";
import { stripPngMetadata } from "../formats/png.js";
import { stripWebpMetadata } from "../formats/webp.js";

export const handlerRegistry = new Map([
  ["jpeg", stripJpegMetadata],
  ["png", stripPngMetadata],
  ["webp", stripWebpMetadata]
]);
