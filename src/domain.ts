export const ISSUE_CATEGORIES = ["paper_path", "connectivity", "supplies", "unknown"] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type Confidence = "low" | "moderate" | "high";
export type WorkOrderStatus = "check" | "stop";

export interface WorkOrder {
  id: string;
  category: IssueCategory;
  confidence: Confidence;
  status: WorkOrderStatus;
  summary: string;
  observations: string[];
  checks: string[];
  escalation: string;
  source: string;
  createdAt: string;
}

const HAZARD_INPUT = /\b(smoke|fire|flame|sparks?|sparking|burn(?:ing)? smell|electric shock|shock|exposed wire|liquid|water|spill|wet|soaked|damp|hot|heat|overheat(?:ed|ing)?)\b/i;
const NEGATED_START = /^\s*(no|not|without|never|none)\b/i;
const INVASIVE_STEP = /\b(?:open(?:ing)?\s+(?:(?:the|a|an)\s+)?(?:(?:service|access)\s+)?(?:case|housing|cover|panel|casing|unit)|remove\s+(?:(?:the|a|an)\s+)?(?:cover|panel|casing)|disassembl(?:e|ing|y)|bypass(?:ing)?\s+(?:(?:the|a|an)\s+)?(?:interlock|safety|sensor)|touch(?:ing)?\s+(?:(?:the)\s+)?(?:wiring|wires?|cables?|exposed\s+wire)|reach(?:ing)?\s+(?:inside|into)\s+(?:(?:the)\s+)?(?:unit|printer|machine|machinery)|work\s+inside\s+(?:(?:the)\s+)?(?:unit|printer|machine|machinery)|probe\s+(?:internal|inside)|short\s+(?:(?:the)\s+)?(?:wires?|terminals?|circuit))\b/i;
const KNOWN_SOURCES = new Set(["ON_DEVICE", "IN_CLOUD", "LOCAL_FIXTURE", "LOCAL_GUARD"]);

function clippedText(value: unknown, fallback: string, max = 240): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").trim();
  return !cleaned || INVASIVE_STEP.test(cleaned) ? fallback : cleaned.slice(0, max);
}

function clippedList(value: unknown, fallback: string[], maxItems = 4, filterUnsafe = false): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[\u0000-\u0008\u000B\u000C-\u001F]/g, " ").trim().slice(0, 180))
    .filter(Boolean)
    .filter((item) => !filterUnsafe || !INVASIVE_STEP.test(item))
    .slice(0, maxItems);
  return cleaned.length ? cleaned : fallback;
}

function hasPositiveHazard(context: string): boolean {
  return context.split(/[.!?;\n]+/).some((sentence) => {
    if (!HAZARD_INPUT.test(sentence)) return false;
    if (NEGATED_START.test(sentence) && !/\b(but|however|except|although)\b/i.test(sentence)) return false;
    return true;
  });
}

export function makeStopOrder(_context: string, source = "LOCAL_GUARD"): WorkOrder {
  const id = globalThis.crypto?.randomUUID?.() ?? `FF-${Math.floor(Math.random() * 1e9)}`;
  return {
    id,
    category: "unknown",
    confidence: "low",
    status: "stop",
    summary: "A heat, smoke, fire, liquid, or electrical hazard was reported. Stop this checklist and keep clear of the unit.",
    observations: ["A safety signal in the supplied report triggered the local stop rule."],
    checks: [
      "Do not open, move, or touch the unit.",
      "If smoke or fire is present, move away and follow the site's emergency procedure.",
      "Otherwise, route the incident to qualified maintenance."
    ],
    escalation: "Do not resume troubleshooting until a qualified person confirms the area and equipment are safe.",
    source,
    createdAt: new Date().toISOString()
  };
}

export function normalizeWorkOrder(input: unknown, context = "", source = "UNKNOWN"): WorkOrder {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  if (hasPositiveHazard(context) || value.hazardDetected === true) return makeStopOrder(context, "LOCAL_GUARD");
  const rawCategory = typeof value.category === "string" && ISSUE_CATEGORIES.includes(value.category as IssueCategory)
    ? (value.category as IssueCategory)
    : "unknown";
  const rawConfidence = value.confidence === "high" || value.confidence === "moderate" || value.confidence === "low"
    ? value.confidence
    : "low";
  let checks = clippedList(value.checks, ["Confirm the exact model-specific instructions before touching the device."]);
  const removedUnsafe = checks.some((step) => INVASIVE_STEP.test(step));
  checks = checks.filter((step) => !INVASIVE_STEP.test(step));
  if (removedUnsafe || checks.length === 0) {
    checks = ["No invasive step is provided. Use the device-specific manual or route the case to qualified maintenance."];
  }

  const safeSource = KNOWN_SOURCES.has(source) ? source : "UNKNOWN";
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `FF-${Math.floor(Math.random() * 1e9)}`,
    category: rawCategory,
    confidence: rawConfidence,
    status: value.hazardDetected === true ? "stop" : "check",
    summary: clippedText(value.summary, "The evidence is not enough for a confirmed diagnosis. Verify the device-specific instructions."),
    observations: clippedList(value.observations, ["No verified observation was returned."], 4, true),
    checks: value.hazardDetected === true
      ? ["Keep clear of the unit and do not open it.", "Route the incident to qualified maintenance."]
      : checks,
    escalation: clippedText(value.escalation, "If the issue repeats or the device appears damaged, stop and contact qualified maintenance."),
    source: safeSource,
    createdAt: new Date().toISOString()
  };
}

export function inputContainsHazard(context: string): boolean {
  return hasPositiveHazard(context);
}

export function sanitizeChecks(checks: string[]): string[] {
  const filtered = checks.filter((step) => !INVASIVE_STEP.test(step));
  return filtered.length ? filtered.slice(0, 4) : ["Use the device-specific manual or route the case to qualified maintenance."];
}
