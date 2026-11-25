import "./styles.css";
import { SAMPLE_MANUAL_NOTE, SAMPLE_ORDER, SAMPLE_SVG, SAMPLE_SYMPTOM } from "./sample";
import { normalizeWorkOrder, type WorkOrder } from "./domain";
import { firebaseIsConfigured, runLiveTriage } from "./firebase-ai";

interface State {
  file: File | null;
  previewUrl: string;
  result: WorkOrder | null;
  checked: Set<number>;
  busy: boolean;
  sample: boolean;
}

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing app root");

const state: State = { file: null, previewUrl: "", result: null, checked: new Set(), busy: false, sample: false };

root.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#top" aria-label="FieldFix home"><span class="brand-mark">F<span>+</span></span><span>FIELD<span class="brand-light">FIX</span></span></a>
    <div class="top-meta"><span class="top-dot"></span><span>FIRST-RESPONSE WORKFLOW</span><span class="top-divider"></span><span>PRE-SUBMISSION BUILD 0.1.0</span></div>
    <div class="top-right"><span id="setup-pill" class="setup-pill">Checking setup…</span></div>
  </header>

  <main id="top" class="page-shell">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow"><span class="eyebrow-line"></span> PHOTO-FIRST · OFFLINE-READY · NO CHAT</p>
        <h1>Turn a first look<br /><em>into a safer next step.</em></h1>
        <p class="hero-lede">A focused handoff tool for office-printer interruptions. Capture what you see, record what changed, and leave with a bounded work order — not a guessed repair.</p>
      </div>
      <div class="hero-aside">
        <div class="scope-tag"><span class="scope-number">01</span><span><strong>One device family</strong><small>Office printers · first response only</small></span></div>
        <div class="scope-tag"><span class="scope-number">02</span><span><strong>Human-confirmed</strong><small>Model output is a clue, never a diagnosis</small></span></div>
        <div class="scope-tag"><span class="scope-number">03</span><span><strong>Local by default</strong><small>Cloud fallback requires your consent</small></span></div>
      </div>
    </section>

    <section class="workspace" aria-label="Printer incident triage workspace">
      <article class="panel intake-panel">
        <div class="panel-head">
          <div><p class="step-label">CASE INTAKE <span>01 / 03</span></p><h2>What do you see?</h2></div>
          <span class="panel-index">A</span>
        </div>

        <div class="photo-frame" id="photo-frame">
          <img id="photo-preview" alt="Selected incident photo preview" hidden />
          <div class="photo-placeholder" id="photo-placeholder">
            <div class="upload-symbol"><span></span><span></span><span></span><i>+</i></div>
            <strong>Add one photo</strong>
            <small>JPG or PNG · kept in this tab's memory</small>
          </div>
          <span class="photo-label" id="photo-label" hidden></span>
        </div>
        <div class="photo-actions">
          <label class="button button-secondary upload-button" for="photo-input">Choose a photo</label>
          <input id="photo-input" type="file" accept="image/jpeg,image/png" hidden />
          <button id="sample-button" class="text-button" type="button">Load the sample case <span>↗</span></button>
        </div>
        <p class="micro-note">AI input is a temporary copy, downscaled to a 1600 px maximum edge and re-encoded without source metadata; it is not saved. The bundled sample is synthetic, not a photo and not evidence of a real fault.</p>

        <label class="field-label" for="symptom-input">What changed? <span>REQUIRED</span></label>
        <textarea id="symptom-input" class="text-area" rows="3" maxlength="1200" placeholder="For example: the paper-feed light started blinking after a partial feed…"></textarea>
        <div class="field-footer"><span>Keep to observable facts. Avoid names or account details.</span><span id="symptom-count">0 / 1200</span></div>

        <label class="field-label optional-label" for="manual-input">Optional · short note from the device's own guide <span>LOCAL UNTIL CONSENT</span></label>
        <textarea id="manual-input" class="text-area manual-area" rows="2" maxlength="6000" placeholder="Paste only the relevant troubleshooting excerpt. It is not stored."></textarea>
        <div class="field-footer"><span>Never use this field for passwords or private records.</span><span id="manual-count">0 / 6000</span></div>

        <div class="routing-box">
          <div class="routing-title"><span class="routing-icon">↔</span><span><strong>Choose the privacy boundary</strong><small id="routing-description">Local-only: this request must stay on the device. No cloud fallback.</small></span></div>
          <label class="consent-row" for="cloud-consent">
            <input id="cloud-consent" type="checkbox" />
            <span class="toggle-ui" aria-hidden="true"></span>
            <span><strong>Allow cloud fallback for this case</strong><small>If Chrome cannot run the local model, this photo, symptom, and optional guide excerpt may be sent to Google through Firebase AI Logic.</small></span>
          </label>
          <p class="route-footnote">Unchecked = <code>ONLY_ON_DEVICE</code>. Checked = <code>PREFER_ON_DEVICE</code>; the SDK's actual route is shown on the work order.</p>
        </div>

        <div class="actions-row">
          <button id="live-button" class="button button-primary" type="button" disabled><span class="button-spark">✳</span><span>Run live Firebase triage</span><span class="button-arrow">→</span></button>
          <button id="demo-button" class="button button-outline" type="button">Preview sample work order</button>
        </div>
        <p id="live-status" class="live-status" role="status" aria-live="polite"></p>
        <div id="setup-note" class="setup-note" role="note"></div>
      </article>

      <article class="panel result-panel" aria-live="polite">
        <div class="panel-head result-head">
          <div><p class="step-label">HANDOFF CARD <span>02 / 03</span></p><h2>Next action, made legible.</h2></div>
          <span class="panel-index">B</span>
        </div>
        <div id="result-content" class="result-content">
          <div class="empty-result">
            <div class="empty-orbit"><span class="orbit-dot"></span><span class="orbit-line"></span><span class="orbit-center">?</span></div>
            <p class="empty-kicker">WAITING FOR EVIDENCE</p>
            <h3>A useful handoff<br />starts with what is known.</h3>
            <p>Add a photo and an observable symptom. The work order will separate evidence, safe checks, and the point where a person should take over.</p>
            <div class="empty-flow"><span>OBSERVE</span><i>·</i><span>CHECK</span><i>·</i><span>HAND OFF</span></div>
          </div>
        </div>
      </article>
    </section>

    <section class="principles" aria-label="Product principles">
      <div><span class="principle-index">A.</span><p><strong>Nothing is silently saved.</strong><br /><small>Photos and notes live in memory for this tab only. Reset clears the case.</small></p></div>
      <div><span class="principle-index">B.</span><p><strong>No invasive repair steps.</strong><br /><small>Unsafe directions are filtered. A qualified person owns the final call.</small></p></div>
      <div><span class="principle-index">C.</span><p><strong>Chrome desktop for on-device AI.</strong><br /><small>Other browsers can preview the fixture; Gemini Nano availability varies by device.</small></p></div>
    </section>

    <footer class="footer"><span>FIELD_FIX / PROTOTYPE 0.1.0</span><span>BUILT WITH FIREBASE AI LOGIC · NO CLOUD CALLS IN SAMPLE MODE</span><a href="https://firebase.google.com/docs/ai-logic/hybrid/web/get-started" target="_blank" rel="noreferrer">HYBRID WEB GUIDE ↗</a></footer>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
`;

const $ = <T extends HTMLElement>(selector: string) => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing UI element: ${selector}`);
  return node;
};
const photoInput = $("#photo-input") as HTMLInputElement;
const photoPreview = $("#photo-preview") as HTMLImageElement;
const photoPlaceholder = $("#photo-placeholder");
const photoLabel = $("#photo-label");
const symptomInput = $("#symptom-input") as HTMLTextAreaElement;
const manualInput = $("#manual-input") as HTMLTextAreaElement;
const cloudConsent = $("#cloud-consent") as HTMLInputElement;
const liveButton = $("#live-button") as HTMLButtonElement;
const liveStatus = $("#live-status");
const resultContent = $("#result-content");
const toast = $("#toast");
let oldPreviewUrl = "";
let toastTimer = 0;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function categoryName(category: WorkOrder["category"]): string {
  return ({ paper_path: "PAPER PATH", connectivity: "CONNECTION", supplies: "SUPPLIES", unknown: "UNCONFIRMED" })[category];
}

function sourceName(source: string): string {
  return ({ ON_DEVICE: "ON-DEVICE · CHROME", IN_CLOUD: "CLOUD · OPTED IN", LOCAL_FIXTURE: "SAMPLE FIXTURE · NOT AI", LOCAL_GUARD: "LOCAL SAFETY STOP", UNKNOWN: "ROUTE UNVERIFIED" })[source] ?? "ROUTE UNVERIFIED";
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function updateSetup(): void {
  const configured = firebaseIsConfigured();
  const setupPill = $("#setup-pill");
  const setupNote = $("#setup-note");
  setupPill.textContent = configured ? "Firebase config · unverified" : "Local fixture · no Firebase project";
  setupPill.classList.remove("configured");
  setupPill.classList.toggle("unverified", configured);
  setupNote.innerHTML = configured
    ? `<strong>Firebase client config is present, but the live path is unverified.</strong> This does not confirm App Check token issuance, enforcement, or model availability. No request runs until you press the live-triage button; see the README for the remaining checks.`
    : `<strong>Live AI is not connected.</strong> This build contains no Firebase project configuration or API secret. The sample workflow is available; live inference stays disabled until a project and App Check are configured.`;
  updateButtons();
}

function updateButtons(): void {
  const configured = firebaseIsConfigured();
  const hasEvidence = Boolean(state.file) && !state.sample && symptomInput.value.trim().length > 0;
  liveButton.disabled = !configured || !hasEvidence || state.busy;
  liveButton.classList.toggle("is-busy", state.busy);
  photoInput.disabled = state.busy;
  symptomInput.disabled = state.busy;
  manualInput.disabled = state.busy;
  cloudConsent.disabled = state.busy;
  $("#sample-button").toggleAttribute("disabled", state.busy);
  $("#demo-button").toggleAttribute("disabled", state.busy);
  resultContent.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button").forEach((control) => { control.disabled = state.busy; });
  $("#routing-description").textContent = cloudConsent.checked
    ? "Hybrid: try Chrome's local model first; cloud fallback is allowed for this case."
    : "Local-only: this request must stay on the device. No cloud fallback.";
}

function setPreview(file: File | null, label: string, fallbackSvg = "", sampleFixture = false): void {
  if (oldPreviewUrl) URL.revokeObjectURL(oldPreviewUrl);
  oldPreviewUrl = "";
  state.result = null;
  state.checked.clear();
  cloudConsent.checked = false;
  renderEmpty();
  state.file = file;
  state.sample = sampleFixture;
  if (file) {
    oldPreviewUrl = URL.createObjectURL(file);
    state.previewUrl = oldPreviewUrl;
    photoPreview.src = oldPreviewUrl;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
    photoLabel.textContent = label;
    photoLabel.hidden = false;
  } else if (fallbackSvg) {
    state.previewUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
    photoPreview.src = state.previewUrl;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
    photoLabel.textContent = label;
    photoLabel.hidden = false;
  } else {
    state.previewUrl = "";
    photoPreview.removeAttribute("src");
    photoPreview.hidden = true;
    photoPlaceholder.hidden = false;
    photoLabel.hidden = true;
  }
  updateButtons();
}

async function svgToPng(svg: string): Promise<File> {
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 960;
    canvas.height = image.naturalHeight || 620;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG conversion failed.")), "image/png"));
    return new File([blob], "fieldfix-synthetic-sample.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(source);
  }
}

function renderEmpty(): void {
  resultContent.innerHTML = `<div class="empty-result"><div class="empty-orbit"><span class="orbit-dot"></span><span class="orbit-line"></span><span class="orbit-center">?</span></div><p class="empty-kicker">WAITING FOR EVIDENCE</p><h3>A useful handoff<br />starts with what is known.</h3><p>Add a photo and an observable symptom. The work order will separate evidence, safe checks, and the point where a person should take over.</p><div class="empty-flow"><span>OBSERVE</span><i>·</i><span>CHECK</span><i>·</i><span>HAND OFF</span></div></div>`;
}

function renderOrder(order: WorkOrder, modelLabel: string): void {
  state.result = order;
  state.checked = new Set();
  const isStop = order.status === "stop";
  const observations = order.observations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const checks = order.checks.map((item, index) => `<label class="check-item"><input type="checkbox" data-check="${index}" /><span class="check-box" aria-hidden="true"></span><span>${escapeHtml(item)}</span></label>`).join("");
  resultContent.innerHTML = `
    <div class="order-topline"><span class="order-id">WORK ORDER · ${escapeHtml(order.id.slice(0, 12).toUpperCase())}</span><span class="source-badge ${order.source === "ON_DEVICE" ? "source-local" : order.source === "IN_CLOUD" ? "source-cloud" : "source-demo"}">${escapeHtml(sourceName(order.source))}</span></div>
    <div class="order-status ${isStop ? "status-stop" : "status-check"}"><span class="status-glyph">${isStop ? "!" : "✓"}</span><span>${isStop ? "STOP & ESCALATE" : "FIRST-LOOK CHECK"}</span><span class="confidence">${escapeHtml(order.confidence.toUpperCase())} CONFIDENCE</span></div>
    <div class="category-line"><span class="category-chip">${escapeHtml(categoryName(order.category))}</span><span class="model-label">${escapeHtml(modelLabel)}</span></div>
    <h3 class="order-summary">${escapeHtml(order.summary)}</h3>
    <section class="order-section"><p class="section-label"><span>01</span> OBSERVED / REPORTED</p><ul class="observation-list">${observations}</ul></section>
    <section class="order-section checks-section"><p class="section-label"><span>02</span> SAFE FIRST CHECKS <small>Confirm each step yourself</small></p><div class="check-list">${checks}</div></section>
    <section class="escalation-box ${isStop ? "escalation-stop" : ""}"><span class="escalation-mark">${isStop ? "!" : "↗"}</span><p><strong>HANDOFF THRESHOLD</strong><br />${escapeHtml(order.escalation)}</p></section>
    <div class="order-foot"><span>Human confirmation required · No repair diagnosis</span><span>NO SERVER SAVE</span></div>
    <div class="result-actions"><button class="button button-secondary" id="copy-order" type="button">Copy handoff</button><button class="button button-outline" id="download-order" type="button">Download .md</button><button class="text-button clear-button" id="clear-case" type="button">Clear case</button></div>
  `;

  resultContent.querySelectorAll<HTMLInputElement>("input[data-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const index = Number(checkbox.dataset.check);
      checkbox.closest(".check-item")?.classList.toggle("checked", checkbox.checked);
      checkbox.checked ? state.checked.add(index) : state.checked.delete(index);
    });
  });
  $("#copy-order").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(orderAsMarkdown(order));
      showToast("Work order copied to your clipboard.");
    } catch {
      showToast("Clipboard access is unavailable in this browser. Use Download instead.");
    }
  });
  $("#download-order").addEventListener("click", () => downloadOrder(order));
  $("#clear-case").addEventListener("click", clearCase);
}

function orderAsMarkdown(order: WorkOrder): string {
  const done = state.checked;
  return `# FieldFix work order\n\n- Case: ${order.id}\n- Category: ${categoryName(order.category)}\n- Confidence: ${order.confidence}\n- Status: ${order.status}\n- Inference source: ${sourceName(order.source)}\n\n## Summary\n${order.summary}\n\n## Observed / reported\n${order.observations.map((item) => `- ${item}`).join("\n")}\n\n## Safe first checks\n${order.checks.map((item, index) => `- [${done.has(index) ? "x" : " "}] ${item}`).join("\n")}\n\n## Handoff threshold\n${order.escalation}\n\nHuman confirmation required. This is not a repair diagnosis.\n`;
}

function downloadOrder(order: WorkOrder): void {
  const blob = new Blob([orderAsMarkdown(order)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fieldfix-work-order.md";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("A local Markdown work order was downloaded.");
}

function clearCase(): void {
  if (oldPreviewUrl) URL.revokeObjectURL(oldPreviewUrl);
  oldPreviewUrl = "";
  state.file = null;
  state.previewUrl = "";
  state.result = null;
  state.checked.clear();
  state.sample = false;
  photoInput.value = "";
  symptomInput.value = "";
  manualInput.value = "";
  $("#symptom-count").textContent = "0 / 1200";
  $("#manual-count").textContent = "0 / 6000";
  liveStatus.textContent = "";
  setPreview(null, "");
  renderEmpty();
  updateButtons();
  showToast("This case was cleared from the tab.");
}

async function loadSampleCase(): Promise<void> {
  state.busy = true;
  liveStatus.textContent = "Loading the local sample fixture…";
  updateButtons();
  symptomInput.value = SAMPLE_SYMPTOM;
  manualInput.value = SAMPLE_MANUAL_NOTE;
  $("#symptom-count").textContent = `${symptomInput.value.length} / 1200`;
  $("#manual-count").textContent = `${manualInput.value.length} / 6000`;
  try {
    const file = await svgToPng(SAMPLE_SVG);
    setPreview(file, "SYNTHETIC SAMPLE · NOT A PHOTO", "", true);
  } catch {
    setPreview(null, "SYNTHETIC SAMPLE · PREVIEW ONLY", SAMPLE_SVG, true);
  } finally {
    state.busy = false;
    updateButtons();
  }
  liveStatus.textContent = "Sample loaded. Use Preview sample work order for a deterministic, non-AI example.";
}

$("#sample-button").addEventListener("click", () => { void loadSampleCase(); });

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0] ?? null;
  if (!file) return;
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    showToast("Choose a JPEG or PNG image.");
    photoInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Choose an image smaller than 5 MB.");
    photoInput.value = "";
    return;
  }
  symptomInput.value = "";
  manualInput.value = "";
  $("#symptom-count").textContent = "0 / 1200";
  $("#manual-count").textContent = "0 / 6000";
  setPreview(file, file.name.toUpperCase());
  liveStatus.textContent = "Photo loaded in this tab. No request has been made.";
});

symptomInput.addEventListener("input", () => {
  cloudConsent.checked = false;
  $("#symptom-count").textContent = `${symptomInput.value.length} / 1200`;
  updateButtons();
});
manualInput.addEventListener("input", () => {
  cloudConsent.checked = false;
  $("#manual-count").textContent = `${manualInput.value.length} / 6000`;
  updateButtons();
});
cloudConsent.addEventListener("change", updateButtons);

$("#demo-button").addEventListener("click", async () => {
  await loadSampleCase();
  showSampleOrder();
});

function showSampleOrder(): void {
  const order = normalizeWorkOrder({ ...SAMPLE_ORDER }, `${symptomInput.value}\n${manualInput.value}`, "LOCAL_FIXTURE");
  renderOrder(order, "Deterministic fixture · no AI call");
  liveStatus.textContent = "Sample result displayed. No image, note, or model request was sent.";
}

liveButton.addEventListener("click", async () => {
  if (!firebaseIsConfigured() || !state.file || state.busy) return;
  if (cloudConsent.checked && !window.confirm("Cloud fallback is enabled for this case. If Chrome cannot run its on-device model, the selected photo, symptom, and optional guide excerpt may be sent to Google through Firebase AI Logic. Continue?")) return;
  if (!cloudConsent.checked && !window.confirm("Local-only mode is selected. This request will not fall back to cloud. Continue on this device?")) return;

  state.busy = true;
  liveStatus.textContent = "Preparing Chrome's on-device model… first-use download may take several minutes.";
  updateButtons();
  try {
    const result = await runLiveTriage(state.file, symptomInput.value, manualInput.value, cloudConsent.checked, (progress) => {
      liveStatus.textContent = `Preparing on-device model · ${progress}%`;
    });
    renderOrder(result.workOrder, result.model);
    liveStatus.textContent = `Completed via ${sourceName(result.inferenceSource)}. The image and notes were not saved by this app.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The live request could not be completed.";
    liveStatus.textContent = message;
    showToast(message);
  } finally {
    state.busy = false;
    updateButtons();
  }
});

function clearOnReloadWarning(): void {
  window.addEventListener("beforeunload", () => {
    if (state.file || state.result) {
      // The app does not persist case data; this event only releases object URLs.
      if (oldPreviewUrl) URL.revokeObjectURL(oldPreviewUrl);
    }
  });
}

updateSetup();
clearOnReloadWarning();
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}
