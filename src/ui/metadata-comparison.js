import { listLabel } from "./formatters.js";

export function appendMetadataComparison(card, before, after) {
  const beforeRow = document.createElement("p");
  const beforeLabel = document.createElement("span");
  beforeLabel.className = "muted";
  beforeLabel.textContent = "Detected before: ";
  beforeRow.append(beforeLabel, document.createTextNode(listLabel(before?.categories, "No recognized fields found")));

  const afterRow = document.createElement("p");
  const afterLabel = document.createElement("span");
  afterLabel.className = "muted";
  afterLabel.textContent = "Detected after: ";
  afterRow.append(afterLabel, document.createTextNode(listLabel(after?.categories, "No recognized fields found")));

  card.append(beforeRow, afterRow);
}
