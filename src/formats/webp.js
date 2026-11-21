import { ProcessingError } from "../core/errors.js";
import { ascii } from "../core/detect.js";
import { concatBytes, readUint32LE, writeUint32LE } from "../utils/binary.js";

export function stripWebpMetadata(input) {
  if (input.length < 12 || ascii(input, 0, 4) !== "RIFF" || ascii(input, 8, 4) !== "WEBP") {
    throw new ProcessingError("Invalid WebP header.", "MALFORMED");
  }
  const declaredSize = readUint32LE(input, 4);
  if (declaredSize + 8 !== input.length) {
    throw new ProcessingError("WebP RIFF size does not match the file length.", "MALFORMED");
  }

  const chunks = [];
  const removed = [];
  let offset = 12;
  while (offset + 8 <= input.length) {
    const type = ascii(input, offset, 4);
    const size = readUint32LE(input, offset + 4);
    const dataEnd = offset + 8 + size;
    const paddedEnd = dataEnd + (size & 1);
    if (paddedEnd > input.length){
        throw new ProcessingError("Invalid WebP chunk length.", "MALFORMED");
    }

    if (type === "VP8X") {
      if (size < 10) throw new ProcessingError("Invalid WebP VP8X chunk.", "MALFORMED");
      const copy = input.slice(offset, paddedEnd);
      copy[8] &= ~0x0c;
      chunks.push(copy);
    } else if (type === "EXIF" || type === "XMP ") {
      removed.push({ type });
    } else {
      chunks.push(input.subarray(offset, paddedEnd));
    }
    offset = paddedEnd;
  }

  if (offset !== input.length) throw new ProcessingError("Malformed WebP chunk table.", "MALFORMED");
  const body = concatBytes(chunks);
  const header = concatBytes([
    new TextEncoder().encode("RIFF"),
    writeUint32LE(4 + body.length),
    new TextEncoder().encode("WEBP")
  ]);
  return { bytes: concatBytes([header, body]), removed, needsReview: false };
}