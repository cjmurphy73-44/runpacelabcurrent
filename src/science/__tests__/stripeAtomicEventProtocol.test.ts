import { describe, expect, it } from 'vitest';
import { processStripeEventOnce } from '../../../base44/shared/stripeAtomicEventProtocol';

function harness() {
  const committed = new Set<string>();
  const queue = new Map<string, Promise<void>>();
  const lock = {
    async runExclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
      const prev = queue.get(key) ?? Promise.resolve();
      let release!: () => void;
      const next = new Promise<void>(resolve => { release = resolve; });
      queue.set(key, prev.then(() => next));
      await prev;
      try { return await work(); } finally { release(); }
    },
  };
  const ledger = {
    async isCommitted(key: string) { return committed.has(key); },
    async commit(key: string) { committed.add(key); },
  };
  return { lock, ledger };
}
describe('source-only Stripe atomic event protocol', () => {
  it('processes 50 simultaneous deliveries of the same event only once', async () => {
    const { lock, ledger } = harness();
    let effects = 0;
    const results = await Promise.all(Array.from({ length: 50 }, () =>
      processStripeEventOnce('stripe:evt_ABC123', lock, ledger, async () => {
        await Promise.resolve();
        effects += 1;
        return 'ok';
      }),
    ));
    expect(effects).toBe(1);
    expect(results.filter(r => r.state === 'processed')).toHaveLength(1);
    expect(results.filter(r => r.state === 'duplicate')).toHaveLength(49);
  });
  it('does not acknowledge an event when the ledger read fails', async () => {
    const { lock } = harness();
    let effects = 0;
    await expect(processStripeEventOnce('stripe:evt_A', lock, {
      isCommitted: async () => { throw new Error('ledger_down'); },
      commit: async () => {},
    }, async () => { effects += 1; })).rejects.toThrow('ledger_down');
    expect(effects).toBe(0);
  });
  it('propagates lock failures without running mutations', async () => {
    let effects = 0;
    await expect(processStripeEventOnce('stripe:evt_A', {
      runExclusive: async () => { throw new Error('lock_unavailable'); },
    }, harness().ledger, async () => { effects += 1; })).rejects.toThrow('lock_unavailable');
    expect(effects).toBe(0);
  });
  it('does not mark a failed mutation as committed', async () => {
    const { lock, ledger } = harness();
    await expect(processStripeEventOnce('stripe:evt_A', lock, ledger, async () => {
      throw new Error('write_failed');
    })).rejects.toThrow('write_failed');
    expect(await ledger.isCommitted('stripe:evt_A')).toBe(false);
  });
  it('does not acknowledge a failed terminal ledger commit', async () => {
    const { lock } = harness();
    await expect(processStripeEventOnce('stripe:evt_A', lock, {
      isCommitted: async () => false,
      commit: async () => { throw new Error('commit_failed'); },
    }, async () => 'written')).rejects.toThrow('commit_failed');
  });
  it('fails closed when no proven provider exists or identity is invalid', async () => {
    const { lock, ledger } = harness();
    await expect(processStripeEventOnce('stripe:undefined', lock, ledger, async () => {})).rejects.toThrow('invalid_stripe_event_id');
    await expect(processStripeEventOnce('stripe:evt_A', null as any, ledger, async () => {})).rejects.toThrow('atomic_stripe_reservation_unavailable');
  });
});
