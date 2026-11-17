// Bounded, time-distributed preview only. This is NOT a lossless FIT archive
// and must never be used as input to per-second zone or load calculations.
// Retain the original FIT independently before promising full-fidelity replay.
export function boundedRecordingPreview(stream, maxSamples = 3600) {
  if (!Array.isArray(stream)) throw new TypeError('Recording must be an array');
  if (!Number.isSafeInteger(maxSamples) || maxSamples < 2 || maxSamples > 3600) {
    throw new RangeError('Preview capacity must be 2..3600 samples');
  }
  const count = stream.length;
  if (!count) return { samples: [], provenance: { original_samples: 0, stored_samples: 0, complete: true, first_time: null, last_time: null } };
  // Do not accept unordered or synthetic timestamps as a truthful time preview.
  let previous = -Infinity;
  for (const sample of stream) {
    if (typeof sample?.time !== 'number' || !Number.isFinite(sample.time) || sample.time < 0 || sample.time <= previous) {
      throw new TypeError('Recording timestamps must be nonnegative, finite and strictly increasing');
    }
    previous = sample.time;
  }
  const samples = count <= maxSamples
    ? stream.slice()
    : Array.from({ length: maxSamples }, (_, index) => stream[Math.floor(index * (count - 1) / (maxSamples - 1))]);
  return {
    samples,
    provenance: {
      original_samples: count,
      stored_samples: samples.length,
      complete: count <= maxSamples,
      first_time: stream[0].time,
      last_time: stream[count - 1].time,
    },
  };
}
