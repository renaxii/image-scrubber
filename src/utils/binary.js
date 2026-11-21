export function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function readUint32BE(bytes, offset) {
  if (offset + 4 > bytes.length) throw new RangeError("Four-byte integer extends past the file.");
  return ((bytes[offset] * 0x1000000) +
    (bytes[offset + 1] * 0x10000) +
    (bytes[offset + 2] * 0x100) +
    bytes[offset + 3]) >>> 0;
}

export function readUint32LE(bytes, offset) {
  if (offset + 4 > bytes.length) throw new RangeError("Four-byte integer extends past the file.");
  return ((bytes[offset]) +
    (bytes[offset + 1] * 0x100) +
    (bytes[offset + 2] * 0x10000) +
    (bytes[offset + 3] * 0x1000000)) >>> 0;
}

export function writeUint32BE(value) {
  return new Uint8Array([
    (value >>> 24) & 0xff, (value >>> 16) & 0xff,
    (value >>> 8) & 0xff, value & 0xff
  ]);
}

export function writeUint32LE(value) {
  return new Uint8Array([
    value & 0xff, (value >>> 8) & 0xff,
    (value >>> 16) & 0xff, (value >>> 24) & 0xff
  ]);
}
