import exifr from "exifr";
import { detectFormat, ascii } from "../core/detect.js";
import { categorizeFields } from "./categorize.js";
import { readUint32BE, readUint32LE } from "../utils/binary.js";

export function inspectBinaryMetadata(bytes, format = detectFormat(bytes)) {
  const containers = [];
  if (format === "jpeg") {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) break;
      const marker = bytes[offset++];
      if (marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) break;
      if (marker === 0xe1) containers.push("JPEG APP1 (Exif/XMP)");
      if (marker === 0xed) containers.push("JPEG APP13 (IPTC)");
      if (marker === 0xfe) containers.push("JPEG COM");
      offset += length;
    }
  } else if (format === "png") {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = readUint32BE(bytes, offset);
      const type = ascii(bytes, offset + 4, 4);
      if (["eXIf","tEXt","zTXt","iTXt","tIME"].includes(type)) containers.push(`PNG ${type}`);
      offset += 12 + length;
      if (type === "IEND") break;
    }
  } else if (format === "webp") {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = ascii(bytes, offset, 4);
      const size = readUint32LE(bytes, offset + 4);
      if (type === "EXIF") containers.push("WebP EXIF");
      if (type === "XMP ") containers.push("WebP XMP");
      offset += 8 + size + (size & 1);
    }
  }
  return {
    containers: [...new Set(containers)],
    fieldCount: containers.length,
    categories: containers.length ? categorizeFields(containers) : []
  };
}

export async function inspectMetadata(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectFormat(bytes);
  const binary = inspectBinaryMetadata(bytes, format);
  const fields = [];

  try {
    const parsed = await exifr.parse(file, { tiff: true, exif: true, gps: true, iptc: true, xmp: true });
    if (parsed) for (const key of Object.keys(parsed)) fields.push(key);
  } catch {
    // The independent binary inspection remains authoritative.
  }

  const names = [...fields, ...binary.containers];
  return {
    format,
    readable: names.length > 0,
    fieldCount: names.length,
    fields: names,
    categories: categorizeFields(names),
    containers: binary.containers
  };
}
