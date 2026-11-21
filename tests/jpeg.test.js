import { describe, expect, it } from "vitest";
import { stripJpegMetadata } from "../src/formats/jpeg.js";
import { inspectBinaryMetadata } from "../src/metadata/inspect.js";

describe("JPEG cleaner", () => {
  it("removes APP1 Exif/XMP and COM segments", () => {
    const bytes = new Uint8Array([
      0xff,0xd8,
      0xff,0xe1,0x00,0x04,0x45,0x78,
      0xff,0xfe,0x00,0x04,0x78,0x79,
      0xff,0xd9
    ]);
    const result = stripJpegMetadata(bytes);
    expect(result.removed.map(item => item.type)).toEqual(["APP1", "COM"]);
    expect(Array.from(result.bytes)).toEqual([0xff,0xd8,0xff,0xd9]);
    expect(inspectBinaryMetadata(result.bytes, "jpeg").containers).toEqual([]);
  });

  it("preserves an ICC APP2 profile segment", () => {
    const bytes = new Uint8Array([
      0xff,0xd8,
      0xff,0xe2,0x00,0x04,0x49,0x43,
      0xff,0xd9
    ]);
    expect(stripJpegMetadata(bytes).bytes).toEqual(bytes);
  });

  it("rejects malformed JPEG data", () => {
    expect(() => stripJpegMetadata(new Uint8Array([0xff,0xd8,0xff]))).toThrow();
  });
});