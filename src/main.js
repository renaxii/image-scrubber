
import JSZip from "jszip";

import {
  detectFormat,
  formatLabel,
  stripMetadata
} from "./lib/formats.js";

import {
  inspectMetadata
} from "./lib/inspect.js";

import "./style.css";

const app = document.querySelector("#app");

const state = {
  files: [],
  results: [],
  busy: false
};

// Application interface

app.innerHTML = `
  <main class="shell">

    <header class="topbar">
      <a class="brand" href="#">
        <span class="brand-mark">◈</span>
        clearframe
      </a>

      <span class="local-pill">
        <span class="dot"></span>
        local processing
      </span>
    </header>

    <section class="intro">
      <p class="eyebrow">PRIVATE BY DESIGN</p>

      <h1>
        your photos,<br>
        <span>without the extra baggage.</span>
      </h1>

      <p class="lede">
        Remove supported identifying metadata
        without re-encoding your image.
        Files stay in this browser.
      </p>
    </section>

    <section class="workspace">

      <label class="dropzone" id="dropzone">

        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
        />

        <span class="upload-icon">↥</span>

        <strong>drop photos here</strong>

        <span class="muted">
          or <span class="choose">choose files</span>
        </span>

        <small>
          JPEG · PNG · WebP · processed on this device
        </small>

      </label>

      <div class="privacy-note">
        <span>✓</span>
        No account. No upload endpoint. No analytics.
      </div>

      <div class="file-area" id="file-area" hidden>

        <div class="section-heading">
          <div>
            <p class="eyebrow">YOUR FILES</p>
            <h2>selected photos</h2>
          </div>

          <button
            class="text-button"
            id="clear-button"
            type="button"
          >
            clear all
          </button>
        </div>

        <div id="file-list" class="file-list"></div>

        <div class="actions">
          <button
            class="primary-button"
            id="clean-button"
            type="button"
          >
            clean selected photos <span>→</span>
          </button>
        </div>

      </div>

      <div class="results-area" id="results-area" hidden>

        <div class="section-heading">
          <div>
            <p class="eyebrow">FINISHED LOCALLY</p>
            <h2>cleaning report</h2>
          </div>

          <button
            class="text-button"
            id="zip-button"
            type="button"
          >
            download all (.zip)
          </button>
        </div>

        <div id="result-list" class="result-list"></div>

      </div>

    </section>

    <footer>
      <span>clearframe · private image cleanup</span>
      <span>lossless container cleanup · supported metadata only</span>
    </footer>

  </main>
`;

// DOM references

const input = document.querySelector("#file-input");
const dropzone = document.querySelector("#dropzone");

const fileArea = document.querySelector("#file-area");
const fileList = document.querySelector("#file-list");

const resultsArea = document.querySelector("#results-area");
const resultList = document.querySelector("#result-list");

const cleanButton = document.querySelector("#clean-button");

// Utility functions

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function bytesLabel(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// File selection

function addFiles(fileListInput) {
  const incoming = Array.from(fileListInput);

  for (const file of incoming) {
    const exists = state.files.some(
      (existing) =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
    );

    if (!exists) {
      state.files.push(file);
    }
  }

  renderFiles();
}

async function renderFiles() {
  fileArea.hidden = state.files.length === 0;

  fileList.innerHTML = "";

  for (const file of state.files) {
    const format = detectFormat(
      new Uint8Array(
        await file.slice(0, 16).arrayBuffer()
      )
    );

    const row = document.createElement("div");

    row.className = "file-row";

    row.innerHTML = `
      <div class="file-symbol">▧</div>

      <div class="file-info">
        <strong>${escapeHtml(file.name)}</strong>
        <span>
          ${formatLabel(format)} · ${bytesLabel(file.size)}
        </span>
      </div>

      <span class="file-status ${
        format === "unsupported" ? "status-warn" : ""
      }">
        ${format === "unsupported" ? "unsupported" : "ready"}
      </span>
    `;

    fileList.append(row);
  }
}

input.addEventListener("change", (event) => {
  addFiles(event.target.files);
  input.value = "";
});

// Drag and drop

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();

  dropzone.classList.remove("dragging");

  addFiles(event.dataTransfer.files);
});

// Clear files

document
  .querySelector("#clear-button")
  .addEventListener("click", () => {

    state.files = [];
    state.results = [];

    fileArea.hidden = true;
    resultsArea.hidden = true;

    fileList.innerHTML = "";
    resultList.innerHTML = "";
  });

// Downloads

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.append(anchor);

  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function cleanName(name) {
  const dot = name.lastIndexOf(".");

  return dot > 0
    ? `${name.slice(0, dot)}-clean${name.slice(dot)}`
    : `${name}-clean`;
}

// Main cleaning process

cleanButton.addEventListener("click", async () => {

  if (state.busy || state.files.length === 0) {
    return;
  }

  state.busy = true;

  cleanButton.disabled = true;
  cleanButton.textContent = "cleaning locally…";

  state.results = [];

  resultsArea.hidden = false;
  resultList.innerHTML = "";

  for (const file of state.files) {

    try {
      // Read original bytes

      const inputBytes = new Uint8Array(
        await file.arrayBuffer()
      );

      // Detect actual format

      const format = detectFormat(inputBytes);

      if (format === "unsupported") {
        throw new Error(
          "Unsupported format. Choose a JPEG, PNG, or WebP image."
        );
      }

      // Inspect original metadata

      const before = await inspectMetadata(file);

      // Remove metadata without re-encoding

      const cleanedBytes = stripMetadata(
        inputBytes,
        format
      );

      const mime =
        format === "jpeg"
          ? "image/jpeg"
          : format === "png"
            ? "image/png"
            : "image/webp";

      const blob = new Blob(
        [cleanedBytes],
        { type: mime }
      );

      // Inspect the output again

      const cleanedFile = new File(
        [blob],
        cleanName(file.name),
        { type: mime }
      );

      const after = await inspectMetadata(cleanedFile);

      const result = {
        original: file.name,
        filename: cleanName(file.name),
        format,
        before,
        after,
        blob,
        originalSize: file.size,
        outputSize: blob.size,
        ok: true
      };

      state.results.push(result);

      renderResult(result);

    } catch (error) {

      const result = {
        original: file.name,
        ok: false,
        error: error.message
      };

      state.results.push(result);

      renderResult(result);
    }
  }

  state.busy = false;

  cleanButton.disabled = false;

  cleanButton.innerHTML =
    'clean selected photos <span>→</span>';
});

// Cleaning report

function renderResult(result) {

  const row = document.createElement("article");

  row.className = "result-card";

  if (!result.ok) {

    row.innerHTML = `
      <div class="result-top">
        <strong>${escapeHtml(result.original)}</strong>
        <span class="status-warn">not cleaned</span>
      </div>

      <p class="error-text">
        ${escapeHtml(result.error)}
      </p>
    `;

  } else {

    const categories = result.before.categories.length
      ? result.before.categories.map(escapeHtml).join(" · ")
      : "No recognized fields found by the metadata inspector";

    const remaining = result.after.categories.length
      ? result.after.categories.map(escapeHtml).join(" · ")
      : "No recognized fields found after cleaning";

    row.innerHTML = `
      <div class="result-top">
        <strong>${escapeHtml(result.filename)}</strong>
        <span class="status-good">processed</span>
      </div>

      <p>
        <span class="muted">Detected before:</span>
        ${categories}
      </p>

      <p>
        <span class="muted">Inspector after:</span>
        ${remaining}
      </p>

      <div class="result-bottom">
        <span>
          ${bytesLabel(result.originalSize)}
          →
          ${bytesLabel(result.outputSize)}
        </span>

        <button class="small-button" type="button">
          download
        </button>
      </div>
    `;

    row
      .querySelector("button")
      .addEventListener("click", () => {
        downloadBlob(result.blob, result.filename);
      });
  }

  resultList.append(row);
}

// Batch ZIP export

document
  .querySelector("#zip-button")
  .addEventListener("click", async () => {

    const successful = state.results.filter(
      (result) => result.ok
    );

    if (!successful.length) {
      return;
    }

    const zip = new JSZip();

    successful.forEach((result) => {
      zip.file(result.filename, result.blob);
    });

    const blob = await zip.generateAsync({
      type: "blob"
    });

    downloadBlob(
      blob,
      "clearframe-cleaned-photos.zip"
    );
  });
