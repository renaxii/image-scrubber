# ClearFrame

Browser-based, lossless-container metadata cleaner for JPEG, PNG, and WebP files.
Processing is performed locally and original files are never modified or uploaded.

## Supported cleanup

- JPEG: removes APP1 Exif/XMP, APP13 IPTC, and comment segments while preserving
  image scan data and color profile segments.
- PNG: removes eXIf, tEXt, zTXt, iTXt, and tIME chunks. Validates PNG chunk CRCs.
- WebP: removes EXIF and XMP chunks and clears their VP8X feature flags.

## Verification limitations

Some unknown metadata-bearing containers cannot be identified reliably. PNG private
or unknown ancillary chunks are preserved and reported with `needs_review`; JPEG
APP0/APP2/APP14 and PNG/WebP color-profile chunks are preserved when structurally
valid because they are needed for image rendering. A `verified` report means the
independent container inspection found no supported metadata containers; it does
not prove the complete absence of every possible vendor-specific metadata field.