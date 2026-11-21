import { inspectBinaryMetadata } from "./inspect.js";

export function verifyCleanOutput(originalBytes, cleanedBytes, format, cleanedReport) {
  const before = inspectBinaryMetadata(originalBytes, format);
  const after = inspectBinaryMetadata(cleanedBytes, format);
  if (after.containers.length > 0) {
    return { status: "failed", remaining: after.containers, reason: "Metadata containers remain after cleaning." };
  }
  if (cleanedReport.needsReview) {
    return { status: "needs_review", remaining: after.containers, reason: cleanedReport.limitations.join(" ") };
  }
  if (before.containers.length === 0) {
    return { status: "verified", remaining: [], reason: "No supported metadata containers were detected and independent verification found none." };
  }
  return { status: "verified", remaining: [], reason: "Supported metadata containers were removed and independent verification found none." };
}
