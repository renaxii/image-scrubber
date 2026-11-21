
import exifr from "exifr";

const patterns = [
  [
    "Location",
    /gps|latitude|longitude|altitude|location/i
  ],
  [
    "Device",
    /make|model|serial|lens|camera|body/i
  ],
  [
    "Capture time",
    /date|time|timestamp|offsettime/i
  ],
  [
    "Author and ownership",
    /artist|author|creator|copyright|owner|rights/i
  ],
  [
    "Editing and software",
    /software|processing|history|comment|description/i
  ]
];

export async function inspectMetadata(file) {
  try {
    const parsed = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      xmp: true
    });

    const keys = parsed
      ? Object.keys(parsed)
      : [];

    const categories = patterns
      .filter(([, pattern]) => keys.some((key) => pattern.test(key)))
      .map(([name]) => name);

    return {
      readable: Boolean(parsed && keys.length),
      categories,
      fieldCount: keys.length
    };

  } catch {
    return {
      readable: false,
      categories: [],
      fieldCount: 0,
      warning: "Some metadata could not be inspected."
    };
  }
}