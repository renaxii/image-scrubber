import { detectFormat } from "./detect.js";
import { ProcessingError } from "./errors.js";
import { handlerRegistry } from "./registry.js";
import { inspectMetadata } from "../metadata/inspect.js";
import { verifyCleanOutput } from "../metadata/verify.js";
import { sha256 } from "../utils/checksum.js";

export async function processFile(file) {
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const format = detectFormat(originalBytes);
  if (format === "unsupported") {
    return {
      status: "unsupported",
      original: file.name,
      originalSize: file.size,
      outputSize: 0,
      originalChecksum: await sha256(originalBytes),
      error: "Unsupported format. Choose a JPEG, PNG, or WebP image.",
      before: { readable: false, categories: [], containers: [] },
      after: null
    };
  }

  try {
    const before = await inspectMetadata(file);
    const handler = handlerRegistry.get(format);
    if (!handler) throw new ProcessingError("No safe handler is registered.", "UNSUPPORTED");
    const cleaned = handler(originalBytes);
    const cleanedBytes = cleaned.bytes;

    const mime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[format];
    const cleanedFile = new File([cleanedBytes], file.name, { type: mime });
    const after = await inspectMetadata(cleanedFile);
    const verification = verifyCleanOutput(originalBytes, cleanedBytes, format, cleaned);
    const originalChecksum = await sha256(originalBytes);
    const outputChecksum = await sha256(cleanedBytes);

    return {
      status: verification.status,
      original: file.name,
      filename: file.name,
      format,
      mime,
      blob: new Blob([cleanedBytes], { type: mime }),
      originalSize: originalBytes.length,
      outputSize: cleanedBytes.length,
      originalChecksum,
      outputChecksum,
      before,
      after,
      removed: cleaned.removed,
      remaining: verification.remaining,
      verification,
      limitations: cleaned.limitations ?? [],
      error: null
    };
  } catch (error) {
    return {
      status: "failed",
      original: file.name,
      format,
      originalSize: file.size,
      outputSize: 0,
      originalChecksum: await sha256(originalBytes),
      before: null,
      after: null,
      removed: [],
      remaining: [],
      verification: { status: "failed", remaining: [], reason: error.message },
      limitations: [],
      error: error.message
    };
  }
}
