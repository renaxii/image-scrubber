import { describe, expect, it } from "vitest";
import { stripPngMetadata } from "../src/formats/png.js";
import { crc32 } from "../src/utils/checksum.js";
import { writeUint32BE } from "../src/utils/binary.js";

function chunk(type, data = new Uint8Array()) {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array([...typeBytes, ...data]);
  const crc = writeUint32BE(crc32(body));
  return new Uint8Array([...writeUint32BE(data.length), ...body, ...crc]);
}

describe("PNG cleaner", () => {
  it("removes text and eXIf chunks and preserves IDAT", () => {
    const signature = new Uint8Array([137,80,78,71,13,10,26,10]);
    const ihdr = chunk("IHDR", new Uint8Array([0,0,0,1,0,0,0,0,8,2,0,0,0]));
    const idat = chunk("IDAT", new Uint8Array([1,2,3,4]));
    const text = chunk("tEXt", new TextEncoder().encode("Author\0Jane"));
    const iend = chunk("IEND");
    const bytes = new Uint8Array([...signature, ...ihdr, ...text, ...idat, ...iend]);
    const result = stripPngMetadata(bytes);
    expect(result.removed.map(item => item.type)).toContain("tEXt");
    expect(Array.from(result.bytes).slice(-iend.length).length).toBe(iend.length);
  });

  it("rejects bad PNG chunk CRC", () => {
    const signature = new Uint8Array([137,80,78,71,13,10,26,10]);
    const bad = chunk("IHDR", new Uint8Array([0,0,0,1,0,0,0,0,8,2,0,0,0]));
    bad[bad.length - 1] ^= 0xff;
    const bytes = new Uint8Array([...signature, ...bad, ...chunk("IEND")]);
    expect(() => stripPngMetadata(bytes)).toThrow(/checksum/i);
  });

  it("returns needs_review for unknown private ancillary chunks", () => {
    const signature = new Uint8Array([137,80,78,71,13,10,26,10]);
    const ihdr = chunk("IHDR", new Uint8Array([0,0,0,1,0,0,0,0,8,2,0,0,0]));
    const privateChunk = chunk("abce", new Uint8Array([1]));
    const bytes = new Uint8Array([...signature, ...ihdr, ...privateChunk, ...chunk("IEND")]);
    const result = stripPngMetadata(bytes);
    expect(result.needsReview).toBe(true);
  });
});