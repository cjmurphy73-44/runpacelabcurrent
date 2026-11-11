import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('base44/functions/corosSync/entry.ts'), 'utf8');
const webhook = source.slice(source.indexOf('async function handleWebhook('), source.indexOf('// App-user action:'));

it('COROS webhook uses bounded original FIT download and checks the FIT header', () => {
  expect(webhook).toMatch(/readBoundedRecording\(await fetch\(fitUrl\)\)/);
  expect(webhook).toMatch(/recording_parse_failed/);
  expect(webhook).toMatch(/recording_telemetry_invalid/);
  expect(webhook).toMatch(/return recordingErrorResponse\(error\)/);
  expect(webhook).not.toMatch(/fall through to JSON summary/);
});

it('COROS webhook retains all decoded samples and records provenance', () => {
  expect(webhook).toMatch(/streams: fitParsed \? fitParsed\.stream : undefined/);
  expect(webhook).toMatch(/recording_provenance: fitProvenance \|\| undefined/);
  expect(webhook).toMatch(/assertInlineWorkoutFits\(payload\)/);
  expect(webhook).not.toMatch(/fitParsed\.stream\.slice\(/);
  expect(webhook.indexOf('assertInlineWorkoutFits(payload)') < webhook.indexOf('WorkoutSession.create(payload)')).toBe(true);
});

it('COROS webhook allows a summary only when no FIT URL was provided', () => {
  expect(webhook).toMatch(/if \(body\.fit_file_url \|\| activity\.fit_file_url\)/);
  expect(webhook).toMatch(/if \(!summary\)/);
  expect(webhook.indexOf('return recordingErrorResponse(error)') < webhook.indexOf('if (!summary)')).toBe(true);
});
