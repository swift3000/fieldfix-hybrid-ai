import type { WorkOrder } from "./domain";

// Original vector fixture for UI and local workflow testing; it is not a photograph or a model result.
export const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620" role="img" aria-label="Illustration of an office printer with a paper-feed warning">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef2df"/><stop offset="1" stop-color="#dce7d5"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#394945"/><stop offset="1" stop-color="#202d2a"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#24352e" flood-opacity=".18"/></filter>
  </defs>
  <rect width="960" height="620" rx="34" fill="url(#bg)"/>
  <circle cx="786" cy="114" r="78" fill="#d2dec9" opacity=".72"/><circle cx="164" cy="502" r="110" fill="#d7e4d2" opacity=".72"/>
  <path d="M242 168h478l31 96H211z" fill="#f7f7ed" stroke="#c1cfc5" stroke-width="10"/>
  <path d="M274 190h410v56H274z" fill="#e9eee4"/><path d="M303 211h145" stroke="#b1beb5" stroke-width="8" stroke-linecap="round"/>
  <g filter="url(#shadow)"><rect x="172" y="254" width="616" height="278" rx="38" fill="url(#body)"/><rect x="218" y="298" width="524" height="89" rx="20" fill="#182522"/>
    <rect x="259" y="324" width="302" height="32" rx="16" fill="#6f8177"/><circle cx="674" cy="343" r="20" fill="#e1a942"/><circle cx="674" cy="343" r="8" fill="#fff0b2"/>
    <path d="M310 390h340l-40 91H350z" fill="#dfe8d9"/><path d="M382 415h204" stroke="#b1c0b4" stroke-width="9" stroke-linecap="round"/>
    <path d="M446 424c17-18 48-17 61 3 11 17-7 31-28 27-17-3-19-15-11-25" fill="none" stroke="#d88a41" stroke-width="11" stroke-linecap="round"/>
    <path d="M216 489h528" stroke="#50635c" stroke-width="8" stroke-linecap="round"/><path d="M258 532v20m440-20v20" stroke="#293834" stroke-width="17" stroke-linecap="round"/>
  </g>
  <g transform="translate(648 116)"><circle r="48" fill="#fff5d9" stroke="#e0b454" stroke-width="4"/><path d="M0-21v25" stroke="#a96d1c" stroke-width="7" stroke-linecap="round"/><circle cy="17" r="4" fill="#a96d1c"/><path d="M-31 34h62" stroke="#e0b454" stroke-width="5" stroke-linecap="round"/></g>
  <text x="54" y="72" fill="#52655c" font-family="Arial,sans-serif" font-size="20" letter-spacing="4">SYNTHETIC FIXTURE · NOT A REAL PHOTO</text>
</svg>`;

export const SAMPLE_SYMPTOM = "Paper-feed light blinking after a partial feed. The tray looks seated. No smoke, heat, liquid, or burning smell reported.";
export const SAMPLE_MANUAL_NOTE = "Fictional demo note: For a repeated feed warning, stop the queued job, confirm the paper tray is seated, and consult the exact model's manual before accessing any paper path. Never force a sheet or open a service panel.";

export const SAMPLE_ORDER: Omit<WorkOrder, "id" | "createdAt"> = {
  category: "paper_path",
  confidence: "moderate",
  status: "check",
  summary: "The report is consistent with a paper-feed interruption, but it is not a confirmed diagnosis. This sample is a deterministic fixture, not AI output.",
  observations: [
    "The sample note reports a partial feed and a blinking paper indicator.",
    "The note says the tray appears seated; the illustration is synthetic and is not evidence."
  ],
  checks: [
    "Stop the queued job from the front-panel controls.",
    "Check only the user-accessible tray named in the device's own manual; do not force paper.",
    "If the warning clears, run one test page and record whether the issue returns."
  ],
  escalation: "If paper resists, the warning repeats, or the unit looks damaged, stop and route the work order to qualified maintenance.",
  source: "LOCAL_FIXTURE"
};
