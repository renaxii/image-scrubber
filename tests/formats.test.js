
import { describe, expect, it } from "vitest";

import {
  detectFormat,
  stripMetadata
} from "../src/lib/formats.js";
import { verifyCleanOutput } from "../src/metadata/verify.js";
import { processFile } from "../src/core/pipeline.js";

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

describe("verification and pipeline", () => {
  it("marks output failed when independent inspection finds a container", () => {
    const original = new Uint8Array([0xff,0xd8,0xff,0xe1,0x00,0x04,0x45,0x78,0xff,0xd9]);
    const cleaned = new Uint8Array([0xff,0xd8,0xff,0xe1,0x00,0x04,0x45,0x78,0xff,0xd9]);
    const result = verifyCleanOutput(original, cleaned, "jpeg", { needsReview: false, limitations: [] });
    expect(result.status).toBe("failed");
  });

  it("returns unsupported status instead of throwing for unsupported files", async () => {
    const file = new File([new Uint8Array([1,2,3])], "not-an-image.bin");
    const result = await processFile(file);
    expect(result.status).toBe("unsupported");
  });
});
