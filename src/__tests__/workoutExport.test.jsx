import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildWorkoutFile, downloadWorkoutFile } from '@/services/workoutExport';
let revoke;
beforeEach(() => {
  vi.useFakeTimers(); revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: revoke });
});
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('exports labelled JSON and releases download resources after the browser consumes the URL', () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const file = buildWorkoutFile({ prescribed_duration_minutes: 25 });
  expect(JSON.parse(file.content).format).toBe('TrainPaceLab structured JSON');
  expect(file.filename).toMatch(/\.json$/);
  downloadWorkoutFile({ prescribed_duration_minutes: 25 });
  expect(click).toHaveBeenCalledOnce();
  expect(document.querySelector('a[download]')).toBeNull();
  expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:test');
});

it('also cleans up the anchor and URL if the download click throws', () => {
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => downloadWorkoutFile({})).toThrow('blocked');
  expect(document.querySelector('a[download]')).toBeNull();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:test');
});
