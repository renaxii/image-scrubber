import { downloadBlob } from "../utils/download.js";
import { bytesLabel } from "./formatters.js";
import { appendMetadataComparison } from "./metadata-comparison.js";

export function renderResult(container, result) {
  const card = document.createElement("article");
  card.className = "result-card";

  if (result.status === "unsupported" || result.status === "failed") {
    const top = document.createElement("div");
    top.className = "result-top";
    const name = document.createElement("strong");
    name.textContent = result.original;
    const status = document.createElement("span");
    status.className = "status-warn";
    status.textContent = result.status;
    top.append(name, status);
    const error = document.createElement("p");
    error.className = "error-text";
    error.textContent = result.error;
    card.append(top, error);
  } else {
    const top = document.createElement("div");
    top.className = "result-top";
    const name = document.createElement("strong");
    name.textContent = result.filename;
    const status = document.createElement("span");
    status.className = result.status === "verified" ? "status-good" : "status-warn";
    status.textContent = result.status;
    top.append(name, status);
    card.append(top);
    appendMetadataComparison(card, result.before, result.after);

    const removed = document.createElement("p");
    removed.className = "report-line";
    removed.textContent = `Removed: ${result.removed?.length ? result.removed.map(item => item.type).join(", ") : "none detected"}`;
    card.append(removed);

    const remaining = document.createElement("p");
    remaining.className = "report-line";
    remaining.textContent = `Remaining: ${result.remaining?.length ? result.remaining.join(", ") : "none detected"}`;
    card.append(remaining);

    if (result.limitations?.length) {
      const limitations = document.createElement("p");
      limitations.className = "error-text";
      limitations.textContent = result.limitations.join(" ");
      card.append(limitations);
    }

    const bottom = document.createElement("div");
    bottom.className = "result-bottom";
    const size = document.createElement("span");
    size.textContent = `${bytesLabel(result.originalSize)} → ${bytesLabel(result.outputSize)}`;
    const download = document.createElement("button");
    download.className = "small-button";
    download.type = "button";
    download.textContent = "download";
    download.addEventListener("click", () => downloadBlob(result.blob, result.filename));
    bottom.append(size, download);
    card.append(bottom);
  }
  container.append(card);
}
