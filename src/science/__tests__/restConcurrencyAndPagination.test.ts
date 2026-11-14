import { describe, expect, it } from 'vitest';
import { readDiagnosticPages } from '../../../base44/shared/diagnosticPagination';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const records = (count: number) => Array.from({ length: count }, (_, i) => ({
  id: String(i + 1),
  created_date: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
}));
const paged = (data: ReturnType<typeof records>) => async (limit: number, skip: number) => data.slice(skip, skip + limit);

describe('Science 1.5: diagnostic pagination', () => {
  it('reads multiple pages without silently truncating', async () => {
    const result = await readDiagnosticPages(paged(records(7)), { pageSize: 3, maxRows: 10 });
    expect(result).toHaveLength(7);
  });
  it('rejects ambiguous same-timestamp sort boundaries', async () => {
    const rows = records(3);
    rows[1].created_date = rows[0].created_date;
    await expect(readDiagnosticPages(paged(rows), { pageSize: 2, maxRows: 10 }))
      .rejects.toThrow('UNSTABLE_PAGINATION_ORDER');
  });
  it('rejects overlapping pages that can occur with concurrent inserts', async () => {
    const rows = records(4);
    await expect(readDiagnosticPages(async (limit, skip) =>
      skip === 0 ? rows.slice(0, limit) : [rows[1], rows[2]], { pageSize: 2, maxRows: 10 }))
      .rejects.toThrow('DUPLICATE_PAGINATION_ROW');
  });
  it('rejects an unbounded history rather than returning a partial success', async () => {
    await expect(readDiagnosticPages(paged(records(5)), { pageSize: 2, maxRows: 4 }))
      .rejects.toThrow('HISTORY_READ_LIMIT');
  });
  it('rejects a provider/backend failure after a successful first page', async () => {
    const rows = records(3);
    await expect(readDiagnosticPages(async (limit, skip) => {
      if (skip > 0) throw new Error('TRANSIENT_BACKEND_FAILURE');
      return rows.slice(0, limit);
    }, { pageSize: 2, maxRows: 10 })).rejects.toThrow('TRANSIENT_BACKEND_FAILURE');
  });
  it('rejects a descending or reordered page even without duplicate IDs', async () => {
    const rows = records(4);
    await expect(readDiagnosticPages(async (limit, skip) =>
      skip === 0 ? rows.slice(0, limit) : [rows[3], rows[2]],
      { pageSize: 2, maxRows: 10 })).rejects.toThrow('UNSTABLE_PAGINATION_ORDER');
  });
  it('rejects an oversized response rather than treating it as complete', async () => {
    await expect(readDiagnosticPages(async () => records(3), { pageSize: 2, maxRows: 10 }))
      .rejects.toThrow('INCOMPLETE_HISTORY_READ');
  });
  it('rejects missing IDs and malformed backend responses', async () => {
    await expect(readDiagnosticPages(async () => [{ created_date: '2026-01-01' }], { pageSize: 2 }))
      .rejects.toThrow('UNSTABLE_PAGINATION_ORDER');
    await expect(readDiagnosticPages(async () => null as never, { pageSize: 2 }))
      .rejects.toThrow('INCOMPLETE_HISTORY_READ');
  });
});

describe('Science 1.5: rest confirmation concurrency safety', () => {
  const backend = readFileSync(resolve(process.cwd(), 'base44/functions/reviewRestDays/entry.ts'), 'utf8');
  const frontend = readFileSync(resolve(process.cwd(), 'src/components/physiology/RestHistoryReview.jsx'), 'utf8');
  it('blocks confirmation before any history read and without writes', () => {
    const gate = backend.indexOf("classifyRestReviewRequest(");
    const reads = backend.indexOf('const sessions: any[] = [];');
    expect(gate).toBeGreaterThan(0);
    expect(reads).toBeGreaterThan(gate);
    expect(backend).toContain('ATOMIC_REST_CONFIRMATION_UNAVAILABLE');
    const policy = readFileSync(resolve(process.cwd(), 'base44/shared/restReviewPolicy.ts'), 'utf8');
    expect(policy).toContain("if (body.action === 'confirm_rest') {");
    expect(policy).toContain("code: 'ATOMIC_REST_CONFIRMATION_UNAVAILABLE'");
    expect(backend).not.toMatch(/DailyMetrics\.(?:create|update|bulkCreate|bulkUpdate)\s*\(/);
    expect(backend).not.toMatch(/recomputeCTLATLTSB\s*\(/);
  });
  it('does not advertise an unsafe confirmation button', () => {
    expect(frontend).not.toContain("action: 'confirm_rest'");
    expect(frontend).toContain('Review only');
  });
});
