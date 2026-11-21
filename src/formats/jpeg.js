import { ProcessingError } from "../core/errors.js";
import { concatBytes } from "../utils/binary.js";

export function stripJpegMetadata(input) {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) {
    throw new ProcessingError("Invalid JPEG header.", "MALFORMED");
  }

  const parts = [input.subarray(0, 2)];
  let offset = 2;
  let foundEoi = false;
  const removed = [];

  while (offset < input.length) {
    const markerStart = offset;
    if (input[offset] !== 0xff) {
      throw new ProcessingError("JPEG contains invalid data outside a segment.", "MALFORMED");
    }

    while (offset < input.length && input[offset] === 0xff) offset += 1;
    if (offset >= input.length) throw new ProcessingError("Truncated JPEG marker.", "MALFORMED");

    const marker = input[offset++];

    if (marker === 0xd9) {
      parts.push(input.subarray(markerStart, offset));
      foundEoi = true;
      break;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(input.subarray(markerStart, offset));
      continue;
    }
    
    if (offset + 2 > input.length) {
      throw new ProcessingError("Truncated JPEG segment length.", "MALFORMED");
    }

    const segmentLength = (input[offset] << 8) | input[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > input.length) {
      throw new ProcessingError("Invalid JPEG segment length.", "MALFORMED");
    }
    const segmentEnd = offset + segmentLength;

    const remove = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!remove) parts.push(input.subarray(markerStart, segmentEnd));
    else removed.push({ type: marker === 0xe1 ? "APP1" : marker === 0xed ? "APP13" : "COM" });

    offset = segmentEnd;

    if (marker === 0xda) {
      const scanStart = offset;
      while (offset < input.length) {
        if (input[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        if (offset + 1 >= input.length) break;
        const next = input[offset + 1];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
          offset += 2;
          continue;
        }
        break;
      }
      if (offset > scanStart) parts.push(input.subarray(scanStart, offset));
    }
  }

  if (!foundEoi) throw new ProcessingError("JPEG is missing the end-of-image marker.", "MALFORMED");
  if (offset !== input.length) {
    throw new ProcessingError("Unexpected data follows the JPEG end marker.", "MALFORMED");
  }
  return { bytes: concatBytes(parts), removed, needsReview: false };
}