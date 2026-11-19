# SUPPORT-001: Offline device sync incident triage (draft)
An independently runnable, non-mutating decision contract for support teams. It maps **explicitly supplied** synthetic evidence to safe, non-promissory next steps. It does not read account records, tokens, raw FIT files, provider APIs or production data. It does not reconnect accounts, retry ingestion, or claim that a verified stream indicator proves full recording coverage.

Run: `node --test scripts/support/syncTriage.node-check.mjs`. The ten synthetic cases exercise connection expiry, failed/pending/unknown sync, missing activities, summary-only telemetry, positive evidence, invalid inputs and input immutability.

**Security and accuracy:** Never request OAuth tokens, passwords, raw health files or payment details in a support ticket. Do not tell athletes to repeat imports blindly; deduplication and partial writes must be reconciled first. Do not mark an activity imported merely because a provider reports success. This helper is a standalone draft, not wired into customer support or live UI. Provider-specific status semantics and athlete-local language need integration review before use.

Release HOLD; no production changes, secrets, publishing or spending.
