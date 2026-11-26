import { describe, expect, it } from 'vitest';
import { parseFitWithLaps } from '../../../base44/shared/workoutParsers';
import { hashCorosRecording, readCorosArchive, saveCorosArchive } from '../../../base44/shared/corosRecordingArchive';

const scope = { athlete_id: 'athlete-a', session_id: 'session-a', provider_activity_id: '100:1234' };

function originalFit(size = 64 * 1024) {
  const bytes = new Uint8Array(size);
  bytes.fill(147);
  bytes[0] = 14;
  bytes.set([46, 70, 73, 84], 8);
  new DataView(bytes.buffer).setUint32(4, size - 16, true);
  return bytes;
}

function archiveStore() {
  const rows: Record<string, any>[] = [];
  return {
    rows,
    async filter(query: Record<string, unknown>, sort: string, limit: number) {
      const matches = rows.filter(row => Object.entries(query).every(([key, value]) => row[key] === value));
      if (sort === 'part_index') matches.sort((a, b) => a.part_index - b.part_index);
      if (sort === '-created_date') matches.reverse();
      return matches.slice(0, limit);
    },
    async bulkCreate(parts: Record<string, unknown>[]) { rows.push(...parts); },
    async create(manifest: Record<string, unknown>) { rows.push(manifest); },
    async deleteMany(query: Record<string, unknown>) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (Object.entries(query).every(([key, value]) => rows[i][key] === value)) rows.splice(i, 1);
      }
    },
  };
}

describe('original COROS FIT archive', () => {
  it('publishes exact original bytes after durable readback across part boundaries', async () => {
    const store = archiveStore();
    const original = originalFit();
    expect(await saveCorosArchive(store, scope, 'user-a', original)).toEqual(original);
    expect(store.rows.filter(row => row.kind === 'part')).toHaveLength(6);
    expect(await readCorosArchive(store, scope)).toEqual(original);
    expect(await readCorosArchive(store, { ...scope, athlete_id: 'athlete-b' })).toBeNull();
  });

  it('reads legacy manifests that omit the original part width', async () => {
    const store = archiveStore();
    const bytes = originalFit(28 * 1024);
    const attempt_id = 'legacy';
    const width = 24 * 1024;
    for (let offset = 0; offset < bytes.length; offset += width) {
      store.rows.push({
        ...scope, attempt_id, kind: 'part', part_index: offset / width,
        data_b64: btoa(String.fromCharCode(...bytes.subarray(offset, offset + width))),
      });
    }
    store.rows.push({
      ...scope, attempt_id, kind: 'manifest', byte_count: bytes.length, part_count: 2,
      sha256: await hashCorosRecording(bytes),
    });
    expect(await readCorosArchive(store, scope)).toEqual(bytes);
  });

  it('reparses all 5,041 samples from an archived 84-minute original FIT', async () => {
    const count = 5041;
    const definition = [0x40, 0, 0, 20, 0, 2, 253, 4, 0x86, 3, 1, 0x02];
    const original = originalFit(14 + definition.length + count * 6 + 2);
    const view = new DataView(original.buffer);
    original.set(definition, 14);
    for (let i = 0; i < count; i++) {
      const offset = 14 + definition.length + i * 6;
      original[offset] = 0;
      view.setUint32(offset + 1, 100_000 + i, true);
      original[offset + 5] = i === count - 1 ? 158 : 145;
    }
    const store = archiveStore();
    await saveCorosArchive(store, scope, 'user-a', original);
    const recovered = await readCorosArchive(store, scope);
    const decoded = parseFitWithLaps(recovered);
    expect(decoded?.stream).toHaveLength(count);
    expect(decoded?.stream.at(-1)).toMatchObject({ time: 5040, heart_rate: 158 });
  });

  it('never mixes concurrent write attempts', async () => {
    const store = archiveStore();
    const original = originalFit();
    const [first, second] = await Promise.all([
      saveCorosArchive(store, scope, 'user-a', original),
      saveCorosArchive(store, scope, 'user-a', original),
    ]);
    expect(first).toEqual(original);
    expect(second).toEqual(original);
    expect(new Set(store.rows.filter(row => row.kind === 'manifest').map(row => row.attempt_id)).size).toBe(2);
    expect(await readCorosArchive(store, scope)).toEqual(original);
  });

  it('fails closed after corruption or missing parts', async () => {
    const store = archiveStore();
    await saveCorosArchive(store, scope, 'user-a', originalFit());
    const part = store.rows.find(row => row.part_index === 1)!;
    part.data_b64 = 'AAAA' + part.data_b64.slice(4);
    await expect(readCorosArchive(store, scope)).rejects.toThrow('checksum mismatch');
    store.rows.splice(store.rows.indexOf(part), 1);
    await expect(readCorosArchive(store, scope)).rejects.toThrow('Incomplete');
  });

  it('does not publish a partial bulk write or a truncated FIT', async () => {
    const store = archiveStore();
    store.bulkCreate = async rows => { store.rows.push(rows[0]); };
    await expect(saveCorosArchive(store, scope, 'user-a', originalFit())).rejects.toThrow('Incomplete');
    expect(store.rows).toHaveLength(0);
    expect(await readCorosArchive(store, scope)).toBeNull();
    const truncated = originalFit().slice(0, -100);
    await expect(saveCorosArchive(store, scope, 'user-a', truncated)).rejects.toThrow('Unsupported');
  });

  it('reconciles a manifest create whose response timed out', async () => {
    const store = archiveStore();
    const create = store.create;
    store.create = async manifest => {
      await create(manifest);
      throw new Error('timeout');
    };
    const original = originalFit();
    expect(await saveCorosArchive(store, scope, 'user-a', original)).toEqual(original);
    expect(await readCorosArchive(store, scope)).toEqual(original);
  });
});
