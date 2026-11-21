export function detectFormat(bytes) {
  if (bytes?.length >= 3 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (bytes?.length >= 8 &&
      [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) {
    return "png";
  }
  if (bytes?.length >= 12 &&
      ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  return "unsupported";
}

export function formatLabel(format) {
  return { jpeg: "JPEG", png: "PNG", webp: "WebP" }[format] ?? "Unsupported";
}

export function ascii(bytes, offset, length) {
  let value = "";
  for (let index = 0; index < length && offset + index < bytes.length; index += 1) {
    value += String.fromCharCode(bytes[offset + index]);
  }
  return value;
}
