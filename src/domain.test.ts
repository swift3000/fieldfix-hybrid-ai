import { describe, expect, it } from "vitest";
import { inputContainsHazard, normalizeWorkOrder } from "./domain";

describe("local safety guard", () => {
  it("detects positive fire and electrical hazards but respects explicit negatives", () => {
    expect(inputContainsHazard("There is a burning smell near the printer.")).toBe(true);
    expect(inputContainsHazard("Sparks appeared.")).toBe(true);
    expect(inputContainsHazard("The printer casing feels hot.")).toBe(true);
    expect(inputContainsHazard("Water spilled beside the printer.")).toBe(true);
    expect(inputContainsHazard("A worker felt a shock when touching the chassis.")).toBe(true);
    expect(inputContainsHazard("No smoke, heat, liquid, or burning smell reported.")).toBe(false);
    expect(inputContainsHazard("The paper indicator is blinking.")).toBe(false);
  });

  it("overrides a generated answer when a hazard is reported", () => {
    const order = normalizeWorkOrder({ category: "paper_path", confidence: "high", summary: "Remove the jam." }, "Sparks appeared.");
    expect(order.status).toBe("stop");
    expect(order.category).toBe("unknown");
    expect(order.checks).toEqual([
      "Do not open, move, or touch the unit.",
      "If smoke or fire is present, move away and follow the site's emergency procedure.",
      "Otherwise, route the incident to qualified maintenance."
    ]);
  });

  it("replaces model-reported hazards with the fixed local stop order", () => {
    const order = normalizeWorkOrder({
      hazardDetected: true,
      summary: "Generated text that should not appear.",
      checks: ["Open the panel and keep repairing."]
    }, "Paper-feed warning reported.", "IN_CLOUD");
    expect(order.status).toBe("stop");
    expect(order.source).toBe("LOCAL_GUARD");
    expect(order.summary).not.toContain("Generated text");
    expect(order.checks[0]).toBe("Do not open, move, or touch the unit.");
  });

  it("filters invasive instructions and bounds output", () => {
    const order = normalizeWorkOrder({
      category: "paper_path",
      confidence: "high",
      summary: "A possible feed issue.",
      observations: ["Visible warning"],
      checks: ["Open the case and remove the cover", "Confirm the external tray is seated"],
      escalation: "Stop if the fault repeats."
    }, "Paper feed stopped", "ON_DEVICE");
    expect(order.status).toBe("check");
    expect(order.checks).toEqual(["No invasive step is provided. Use the device-specific manual or route the case to qualified maintenance."]);
    expect(order.source).toBe("ON_DEVICE");
  });

  it("filters invasive instructions from every generated text field", () => {
    const order = normalizeWorkOrder({
      summary: "Open the service panel to inspect wiring.",
      observations: ["A warning lamp is visible.", "Touch wiring behind the cover."],
      checks: ["Confirm the external tray is seated."],
      escalation: "Reach inside the unit to pull the sheet out."
    }, "Paper feed stopped.", "ON_DEVICE");
    expect(order.summary).toBe("The evidence is not enough for a confirmed diagnosis. Verify the device-specific instructions.");
    expect(order.observations).toEqual(["A warning lamp is visible."]);
    expect(order.checks).toEqual(["Confirm the external tray is seated."]);
    expect(order.escalation).toBe("If the issue repeats or the device appears damaged, stop and contact qualified maintenance.");
  });

  it("rejects ambiguous feed-mechanism inspection instructions seen in an actual model result", () => {
    const order = normalizeWorkOrder({
      checks: ["Ensure paper is properly seated in the tray.", "Check the paper feed mechanism for obstructions."]
    }, "Paper-feed warning reported.", "ON_DEVICE");
    expect(order.checks).toEqual(["No invasive step is provided. Use the device-specific manual or route the case to qualified maintenance."]);
  });

  it("normalizes malformed model output to a cautious work order", () => {
    const order = normalizeWorkOrder({ category: "made_up", confidence: "certain", checks: [] }, "Unclear error");
    expect(order.category).toBe("unknown");
    expect(order.confidence).toBe("low");
    expect(order.checks.length).toBeGreaterThan(0);
    expect(order.escalation.length).toBeGreaterThan(0);
  });

  it("does not accept arbitrary inference-source values", () => {
    const order = normalizeWorkOrder({ summary: "Unknown source" }, "", "SECRET_TOKEN");
    expect(order.source).toBe("UNKNOWN");
  });
});
