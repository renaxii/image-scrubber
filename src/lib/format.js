const JPEG = [0xff, 0xd8];
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];

export function detectFormat(bytes){
    if (bytes.length >= 3 && JPEG.every((v,i) => bytes[i] === v))
        return "jpeg";

    if (bytes.length >= 8 && PNG.every((v,i) => bytes[i] === v))
        return "png";

    if (bytes.length >= 12 && ascii(bytes,0,4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP")
        return "webp";

    return "unsupported";
}

function ascii(bytes, start, length){
    return String.fromCharCode(...bytes.slice(start, start + length));
}

function concat(parts){
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(size);
    let offset = 0;

    for (const part of parts){
        output.set(part, offset);
        offset += part.length;
    }

    return output;
}

function readU32BE(bytes, offset){
    return (bytes[offset] * 0x1000000 + (bytes[offset + 1] << 16) + (bytes[offset +2] << 8) + bytes[offset + 3]);
}

function writeU32LE(value){
    return new Uint8Array([value & 0xff, (value >>> 8)&0xff, (value >>> 16)& 0xff, (value >>> 24) & 0xff]);
}

// jpeg
function stripJpeg(input){
    if(input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8){
        throw new Error("Invalid JPEG header");
    }
}

const parts = [input.subarray(0, 2)];

let offset = 2;
let reachedEnd = false;

while(offset < input.length){
    const markerStart = offset;

    if(input[offset] !== 0xff){
        throw new Error("Invalid JPEG marker");
    }

    while (offset < input.length && input[offset] === 0xff){
        offset++;
    }

    if (offset >= input.length){
        throw new Error("Truncated JPEG marker");
    }

    const marker = input[offset++];

    if (marker == 0xd9){
        parts.push(input.subarray(markerStart, offset));
        reachedEnd = true;
        break;
    }

    // standalone markers
    if(marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)){
        parts.push(input.subarray(markerStart, offset));
        continue;
    }

    if (offset + 2 > input.length){
        throw new Error("Truncated JPEG segment");
    }

    const segmentLength = (input[offset] << 8) + input[offset + 1]; = (input[offset] << 8) | input[offset+1];

    if(segmentLength < 2 || offset + segmentLength>input.length){
        throw new Error("Invalid JPEG segment length");

    }

    const segmentEnd = offset + segmenthLength;

    const remove = marker === 0xe1 || marker === 0xed || marker === 0xfe;

    if (!remove{
        parts.push(input.subarray(markerStart, segmentEnd));
    })

    offset = segmentEnd;

    // scan data -> special handling
    if (marker === 0xda){
        const scanStart = offset;

        while (offset<input.length){
            if(input[offset] !== 0xff){
                offset++;
                continue;
            }

            if(offset + 1 >= input.length){
                throw new Error("Truncated JPEG scan");
            }

            const next=input[offset+1];

            if(next === 0x00 || (next >= 0xd0 && next <= 0xd7)){
                offset += 2;
                continue;
            }
            break;
        }
        parts.push(input.subarray(scanStart, offset));
    }
    if(!reachedEnd){
        throw new Error("JPEG is missing end marker");
    }

    return concat(parts);
}

// png
function stripPng(input){
    const signature = new Uint8array(PNG);

    if (input.length < 8 || !signature.every((v,i) => input[i] === v)){
        throw new Error("Invalid PNG signature");
    }

    const parts = [input.subarray(0,8)];

    const removeTypes = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

    let offset = 8;
    let foundEnd = false;

    while(offset + 12 <= input.length){
        const length = readU32BE(input, offset);
        const end = offset + 12 + length;

        if (end > input.length){
            throw new Error("Invalid PNG chunk length");
        }

        const type = String.fromCharCode(...input.subarray(offset+4, offset+8));

        if (!removeTypes.has(type)){
            parts.push(input.subarray(offset, end));

        }

        offset = end;

        if(type === "IEND"){
            foundEnd = true;
            break;
        }

        if(!foundEnd){
            throw new Error("PNG is missing its IEND chunk");
        }

        if (offset !== input.length){
            throw new Error("Unexpected data after IEND chunk");
        }

        return concat(parts);
    }
}

// WEBP

function stripWebp(input) {
  if (input.length < 12 || ascii(input, 0, 4) !== "RIFF" || ascii(input, 8, 4) !== "WEBP") {
    throw new Error("Invalid WebP header.");
  }

  const declaredRiffSize = input[4] | (input[5] << 8) | (input[6] << 16) | (input[7] << 24);

  if ( declaredRiffSize < 4 || declaredRiffSize + 8 !== input.length) {
    throw new Error(
      "WebP RIFF size doesn't match the file length."
    );
  }

  const chunks = [];
  let offset = 12;

  while (offset + 8 <= input.length) {
    const type = ascii(input, offset, 4);

    const size = input[offset + 4] | (input[offset + 5] << 8) | (input[offset + 6] << 16) | (input[offset + 7] << 24);

    const dataEnd = offset + 8 + size;
    const paddedEnd = dataEnd + (size & 1);

    if (size < 0 || paddedEnd > input.length) {
      throw new Error("Invalid WebP chunk length.");
    }

    const chunk = input.subarray(offset, paddedEnd);

    if (type === "VP8X") {
      if (size < 10) {
        throw new Error("Invalid WebP VP8X chunk.");
      }

      const copy = chunk.slice();

      copy[8] &= ~0x0c;

      chunks.push(copy);
    } else if (type !== "EXIF" && type !== "XMP ") {
      chunks.push(chunk);
    }

    offset = paddedEnd;
  }

  if (offset !== input.length) {
    throw new Error("Malformed WebP chunk table.");
  }

  const body = concat(chunks);

  const header = concat([new TextEncoder().encode("RIFF"), writeU32LE(4 + body.length), new TextEncoder().encode("WEBP")]);

  return concat([header, body]);
}


export function stripMetadata(bytes, format = detectFormat(bytes)) {
  switch (format) {
    case "jpeg":
      return stripJpeg(bytes);

    case "png":
      return stripPng(bytes);

    case "webp":
      return stripWebp(bytes);

    default:
      throw new Error(
        "This image format is not supported for lossless cleaning."
      );
  }
}

export function formatLabel(format) {
  return {
    jpeg: "JPEG",
    png: "PNG",
    webp: "WebP"
  }[format] ?? "Unsupported";
}
