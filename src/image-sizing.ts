export interface ImageDimensions {
  width: number;
  height: number;
}

export function fitWithinMaxEdge(width: number, height: number, maxEdge = 1600): ImageDimensions {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new RangeError("Image dimensions must be positive integers.");
  }
  if (!Number.isInteger(maxEdge) || maxEdge < 1) {
    throw new RangeError("The maximum edge must be a positive integer.");
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}
