import { describe, expect, it } from "vitest";
import { stripWebpMetadata } from "../src/formats/webp.js";
import { writeUint32LE } from "../src/utils/binary.js";

function chunk(type, data) {
  const header = new Uint8Array([
    ...new TextEncoder().encode(type),
    ...writeUint32LE(data.length)
  ]);
  return new Uint8Array([...header, ...data, ...(data.length & 1 ? [0] : [])]);
}

function webp(bodyChunks) {
  const body = new Uint8Array(bodyChunks.reduce((acc, item) => acc + item.length, 0));
  let offset = 0;
  bodyChunks.forEach(item => { body.set(item, offset); offset += item.length; });
  return new Uint8Array([
    ...new TextEncoder().encode("RIFF"),
    ...writeUint32LE(4 + body.length),
    ...new TextEncoder().encode("WEBP"),
    ...body
  ]);
}

describe("WebP cleaner", () => {
  it("removes EXIF and XMP chunks", () => {
    const vp8 = chunk("VP8 ", new Uint8Array([1,2,3,4]));
    const exif = chunk("EXIF", new Uint8Array([9,8,7]));
    const xmp = chunk("XMP ", new Uint8Array([6,5]));
    const bytes = webp([vp8, exif, xmp]);
    const result = stripWebpMetadata(bytes);
    expect(result.removed.map(item => item.type).sort()).toEqual(["EXIF", "XMP "]);
    expect(result.bytes).not.toEqual(bytes);
  });

  it("clears VP8X metadata flags", () => {
    const vp8xData = new Uint8Array(10);
    vp8xData[0] = 0x0c;
    const vp8 = chunk("VP8 ", new Uint8Array([1,2,3]));
    const bytes = webp([chunk("VP8X", vp8xData), vp8]);
    const result = stripWebpMetadata(bytes);
    const vp8x = result.bytes.subarray(12, 22);
    expect(vp8x[8]).toBe(0);
  });

  it("rejects malformed RIFF length", () => {
    const bytes = new Uint8Array([...new TextEncoder().encode("RIFF"), 0,0,0,0, ...new TextEncoder().encode("WEBP")]);
    expect(() => stripWebpMetadata(bytes)).toThrow();
  });
});