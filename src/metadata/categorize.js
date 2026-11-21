export function categorizeField(name) {
  const key = String(name).toLowerCase();
  if (/gps|latitude|longitude|altitude|location/.test(key)) return "GPS";
  if (/make|model|serial|lens|camera|body/.test(key)) return "Device";
  if (/date|time|timestamp|offset/.test(key)) return "Timestamp";
  if (/artist|author|creator|copyright|owner|rights/.test(key)) return "Author and copyright";
  if (/software|processing|history|comment|description/.test(key)) return "Software and editing";
  return "Other";
}

export function categorizeFields(names) {
  return [...new Set(names.map(categorizeField))];
}
