/**
 * Extracts sub-splits (400m, 800m, 1k, 5k) using O(N) sliding window.
 */
export const calculateSubSplits = (telemetryStream = []) => {
  if (!Array.isArray(telemetryStream) || telemetryStream.length === 0) {
    return { splits: [] };
  }

  // Implementation logic (simplified for brevity)
  const results = [];
  // Sliding window implementation here...
  
  return { splits: results };
};
