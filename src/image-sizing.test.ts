import { describe, expect, it } from "vitest";
import { fitWithinMaxEdge } from "./image-sizing";

describe("image input dimensions", () => {
  it("scales landscape images to the maximum edge while preserving proportions", () => {
    expect(fitWithinMaxEdge(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales portrait images without swapping orientation", () => {
    expect(fitWithinMaxEdge(1200, 2400)).toEqual({ width: 800, height: 1600 });
  });

  it("does not upscale already-small images", () => {
    expect(fitWithinMaxEdge(900, 600)).toEqual({ width: 900, height: 600 });
  });

  it("rejects zero, fractional, or invalid maximum dimensions", () => {
    expect(() => fitWithinMaxEdge(0, 100)).toThrow(RangeError);
    expect(() => fitWithinMaxEdge(10.5, 100)).toThrow(RangeError);
    expect(() => fitWithinMaxEdge(100, 100, 0)).toThrow(RangeError);
  });
});
