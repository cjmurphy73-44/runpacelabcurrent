import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('base44/functions/corosSync/entry.ts'), 'utf8');
const webhook = source.slice(source.indexOf('async function handleWebhook('), source.indexOf('// App-user action:'));

test('COROS webhook uses bounded original FIT download and checks the FIT header', () => {
  assert.match(webhook, /readBoundedRecording\(await fetch\(fitUrl\)\)/);
  assert.match(webhook, /recording_parse_failed/);
  assert.match(webhook, /recording_telemetry_invalid/);
  assert.match(webhook, /return recordingErrorResponse\(error\)/);
  assert.doesNotMatch(webhook, /fall through to JSON summary/);
});

test('COROS webhook retains all decoded samples and records provenance', () => {
  assert.match(webhook, /streams: fitParsed \? fitParsed\.stream : undefined/);
  assert.match(webhook, /recording_provenance: fitProvenance \|\| undefined/);
  assert.match(webhook, /assertInlineWorkoutFits\(payload\)/);
  assert.doesNotMatch(webhook, /fitParsed\.stream\.slice\(/);
  assert.ok(webhook.indexOf('assertInlineWorkoutFits(payload)') < webhook.indexOf('WorkoutSession.create(payload)'));
});

test('COROS webhook allows a summary only when no FIT URL was provided', () => {
  assert.match(webhook, /if \(body\.fit_file_url \|\| activity\.fit_file_url\)/);
  assert.match(webhook, /if \(!summary\)/);
  assert.ok(webhook.indexOf('return recordingErrorResponse(error)') < webhook.indexOf('if (!summary)'));
});
