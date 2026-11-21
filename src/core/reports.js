export function createJsonReport(results) {
  return JSON.stringify({
    application: "ClearFrame",
    generatedAt: new Date().toISOString(),
    files: results.map(result => ({
      original: result.original,
      filename: result.filename ?? null,
      format: result.format ?? "unsupported",
      status: result.status,
      originalSize: result.originalSize,
      outputSize: result.outputSize,
      originalChecksum: result.originalChecksum,
      outputChecksum: result.outputChecksum ?? null,
      metadataBefore: result.before,
      metadataAfter: result.after,
      metadataRemoved: result.removed ?? [],
      metadataRemaining: result.remaining ?? [],
      verification: result.verification ?? null,
      limitations: result.limitations ?? [],
      error: result.error ?? null
    }))
  }, null, 2);
}
