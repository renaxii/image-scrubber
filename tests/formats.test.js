
import { describe, expect, it } from "vitest";

import {
  detectFormat,
  stripMetadata
} from "../src/lib/formats.js";

describe("format detection", () => {

  it("recognizes JPEG", () => {
    expect(
      detectFormat(
        new Uint8Array([
          0xff, 0xd8, 0xff, 0xd9
        ])
      )
    ).toBe("jpeg");
  });

  it("recognizes PNG", () => {
    expect(
      detectFormat(
        new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10
        ])
      )
    ).toBe("png");
  });

  it("recognizes WebP", () => {
    const bytes = new TextEncoder().encode(
      "RIFFxxxxWEBP"
    );

    expect(detectFormat(bytes)).toBe("webp");
  });

  it("rejects unsupported data", () => {
    expect(
      detectFormat(new Uint8Array([1, 2, 3]))
    ).toBe("unsupported");
  });
});

describe("malformed file handling", () => {

  it("rejects truncated JPEG", () => {
    expect(() =>
      stripMetadata(
        new Uint8Array([0xff, 0xd8, 0xff]),
        "jpeg"
      )
    ).toThrow();
  });

  it("rejects truncated PNG", () => {
    expect(() =>
      stripMetadata(
        new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10
        ]),
        "png"
      )
    ).toThrow();
  });

  it("rejects unsupported formats", () => {
    expect(() =>
      stripMetadata(
        new Uint8Array([1, 2, 3]),
        "unsupported"
      )
    ).toThrow();
  });
});
