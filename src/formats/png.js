import { ProcessingError } from "../core/errors.js";
import { ascii } from "../core/detect.js";
import { concatBytes, readUint32BE } from "../utils/binary.js";
import { crc32 } from "../utils/checksum.js";

export function stripPngMetadata(input) {
  const signature = [137,80,78,71,13,10,26,10];
  if (input.length < 8 || !signature.every((value, index) => input[index] === value)) {
    throw new ProcessingError("Invalid PNG signature.", "MALFORMED");
  }

  const parts = [input.subarray(0, 8)];
  const removed = [];
  const unknownAncillary = [];
  const metadataTypes = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
  let offset = 8;
  let foundEnd = false;
  let foundHeader = false;

  while (offset + 12 <= input.length) {
    const length = readUint32BE(input, offset);
    const end = offset + 12 + length;
    if (end > input.length) throw new ProcessingError("Invalid PNG chunk length.", "MALFORMED");

    const type = ascii(input, offset + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type)) throw new ProcessingError("Invalid PNG chunk type.", "MALFORMED");

    const storedCrc = readUint32BE(input, offset + 8 + length);
    const computedCrc = crc32(input.subarray(offset + 4, offset + 8 + length));
    if (storedCrc !== computedCrc) {
      throw new ProcessingError(`PNG ${type} chunk checksum is invalid.`, "MALFORMED");
    }

    if (type === "IHDR") {
      if (length !== 13) throw new ProcessingError("Invalid PNG IHDR chunk.", "MALFORMED");
      foundHeader = true;
    }
    if (!foundHeader && type !== "IHDR") {
      throw new ProcessingError("PNG IHDR chunk is missing or misplaced.", "MALFORMED");
    }

    if (metadataTypes.has(type)) removed.push({ type });
    else {
      parts.push(input.subarray(offset, end));
      const known = new Set(["sRGB","gAMA","cHRM","iCCP","pHYs","bKGD","hIST","tRNS","acTL","fcTL","fdAT","IHDR","PLTE","IDAT","IEND"]);
      if (!known.has(type) && /^[A-Za-z]{2}[a-z][A-Za-z]$/.test(type)) {
        unknownAncillary.push(type);
      }
    }

    offset = end;
    if (type === "IEND") {
      if (length !== 0) throw new ProcessingError("Invalid PNG IEND chunk.", "MALFORMED");
      foundEnd = true;
      break;
    }
  }

  if (!foundHeader) throw new ProcessingError("PNG IHDR chunk is missing.", "MALFORMED");
  if (!foundEnd) throw new ProcessingError("PNG is missing its IEND chunk.", "MALFORMED");
  if (offset !== input.length) throw new ProcessingError("Unexpected data follows the PNG IEND chunk.", "MALFORMED");

  const uniqueUnknown = [...new Set(unknownAncillary)];
  return {
    bytes: concatBytes(parts),
    removed,
    needsReview: uniqueUnknown.length > 0,
    limitations: uniqueUnknown.length
      ? [`Unknown PNG ancillary chunks were preserved: ${uniqueUnknown.join(", ")}.`]
      : []
  };
}