import JSZip from "jszip";
import "./style.css";
import { processFile } from "./core/pipeline.js";
import { createJsonReport } from "./core/reports.js";
import { renderFileList } from "./ui/file-list.js";
import { renderResult } from "./ui/results.js";
import { cleanName, downloadBlob } from "./utils/download.js";

const app = document.querySelector("#app");
const state = { files: [], results: [], busy: false };

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#"><span class="brand-mark">◈</span>clearframe</a>
      <span class="local-pill"><span class="dot"></span>local processing</span>
    </header>
    <section class="intro">
      <p class="eyebrow">PRIVATE BY DESIGN</p>
      <h1>your photos,<br><span>without the extra baggage.</span></h1>
      <p class="lede">Remove supported identifying metadata without re-encoding your image. Files stay in this browser.</p>
    </section>
    <section class="workspace">
      <label class="dropzone" id="dropzone">
        <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple />
        <span class="upload-icon">↥</span>
        <strong>drop photos here</strong>
        <span class="muted">or <span class="choose">choose files</span></span>
        <small>JPEG · PNG · WebP · processed on this device</small>
      </label>
      <div class="privacy-note"><span>✓</span>No account. No upload endpoint. No analytics.</div>
      <div class="file-area" id="file-area" hidden>
        <div class="section-heading">
          <div><p class="eyebrow">YOUR FILES</p><h2>selected photos</h2></div>
          <button class="text-button" id="clear-button" type="button">clear all</button>
        </div>
        <div id="file-list" class="file-list"></div>
        <div class="actions">
          <button class="primary-button" id="clean-button" type="button">clean selected photos <span>→</span></button>
        </div>
      </div>
      <div class="results-area" id="results-area" hidden>
        <div class="section-heading">
          <div><p class="eyebrow">FINISHED LOCALLY</p><h2>cleaning report</h2></div>
          <div class="export-actions">
            <button class="text-button" id="json-button" type="button">export JSON</button>
            <button class="text-button" id="zip-button" type="button">download all (.zip)</button>
          </div>
        </div>
        <div id="result-list" class="result-list"></div>
      </div>
    </section>
    <footer>
      <span>clearframe · private image cleanup</span>
      <span>lossless container cleanup · binary verification</span>
    </footer>
  </main>`;

const input = document.querySelector("#file-input");
const dropzone = document.querySelector("#dropzone");
const fileArea = document.querySelector("#file-area");
const fileList = document.querySelector("#file-list");
const resultsArea = document.querySelector("#results-area");
const resultList = document.querySelector("#result-list");
const cleanButton = document.querySelector("#clean-button");

function addFiles(incoming) {
  for (const file of Array.from(incoming)) {
    if (!state.files.some(existing =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified)) {
      state.files.push(file);
    }
  }
  fileArea.hidden = state.files.length === 0;
  renderFileList(fileList, state.files);
}

input.addEventListener("change", event => {
  addFiles(event.target.files);
  input.value = "";
});
dropzone.addEventListener("dragover", event => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
dropzone.addEventListener("drop", event => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});

document.querySelector("#clear-button").addEventListener("click", () => {
  state.files = [];
  state.results = [];
  fileArea.hidden = true;
  resultsArea.hidden = true;
  fileList.replaceChildren();
  resultList.replaceChildren();
});

cleanButton.addEventListener("click", async () => {
  if (state.busy || state.files.length === 0) return;
  state.busy = true;
  state.results = [];
  cleanButton.disabled = true;
  cleanButton.textContent = "cleaning locally…";
  resultsArea.hidden = false;
  resultList.replaceChildren();

  for (const file of state.files) {
    const result = await processFile(file);
    if (result.blob) result.filename = cleanName(file.name);
    state.results.push(result);
    renderResult(resultList, result);
  }

  state.busy = false;
  cleanButton.disabled = false;
  cleanButton.innerHTML = 'clean selected photos <span>→</span>';
});

document.querySelector("#zip-button").addEventListener("click", async () => {
  const downloadable = state.results.filter(result =>
    result.blob && (result.status === "verified" || result.status === "needs_review"));
  if (!downloadable.length) return;
  const zip = new JSZip();
  downloadable.forEach(result => zip.file(result.filename, result.blob));
  zip.file("clearframe-report.json", createJsonReport(state.results));
  downloadBlob(await zip.generateAsync({ type: "blob" }), "clearframe-cleaned-photos.zip");
});

document.querySelector("#json-button").addEventListener("click", () => {
  if (!state.results.length) return;
  downloadBlob(
    new Blob([createJsonReport(state.results)], { type: "application/json" }),
    "clearframe-processing-report.json"
  );
});
