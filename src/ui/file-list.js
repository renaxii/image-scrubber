import { detectFormat, formatLabel } from "../core/detect.js";
import { bytesLabel } from "./formatters.js";

export async function renderFileList(container, files) {
  container.replaceChildren();
  for (const file of files) {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const format = detectFormat(bytes);
    const row = document.createElement("div");
    row.className = "file-row";
    const symbol = document.createElement("div");
    symbol.className = "file-symbol";
    symbol.textContent = "▧";
    const info = document.createElement("div");
    info.className = "file-info";
    const name = document.createElement("strong");
    name.textContent = file.name;
    const details = document.createElement("span");
    details.textContent = `${formatLabel(format)} · ${bytesLabel(file.size)}`;
    info.append(name, details);
    const status = document.createElement("span");
    status.className = `file-status ${format === "unsupported" ? "status-warn" : ""}`;
    status.textContent = format === "unsupported" ? "unsupported" : "ready";
    row.append(symbol, info, status);
    container.append(row);
  }
}
