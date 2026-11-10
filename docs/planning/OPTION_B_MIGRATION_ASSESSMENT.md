# Option B: conditional architecture candidate, not an approved cutover

9 November 2026. Owner requested independent evaluation and a roadmap entry.
Candidate: current Vite/React frontend + Supabase/PostgreSQL/Auth + private R2
recordings + Vercel hosting/API. No account, database, bucket, deployment, DNS,
production data migration or Base44 cancellation is authorized by this assessment.

## Decision

Keep Option B as a gated portability milestone. It is technically plausible and
can improve ownership of schemas, transactional operations, tests and raw-file
storage. Do not pause visible app fixes or make migration a prerequisite for the
Garmin/COROS MVP. The frontend is already Vite/React/Tailwind and offline tests
already run; a migration does not unlock those capabilities for the first time.
The urgent data-loss bugs are application logic, not evidence that a different
host automatically fixes fidelity or scientific accuracy.

Reject three assumptions in the proposal:

- **Zero lock-in:** PostgreSQL and S3-compatible APIs reduce switching cost, but
  hosted auth identity/session semantics, RLS helpers, Edge/runtime APIs, signed
  assets, jobs and deployment conventions still create dependencies. Keep domain,
  auth, storage and background-job boundaries explicit rather than claiming none.
- **Guaranteed $0 for 0–500 athletes:** free-tier eligibility, commercial terms,
  DB/storage/egress/operation/compute quotas, backups, email and AI usage matter
  more than athlete count. Vercel Hobby has historically targeted personal/non-
  commercial use; verify current commercial eligibility before a paid app relies
  on it. R2's zero-egress feature is not zero storage/request cost or zero cost at
  the other services. The supplied Base44 $50 figure is not account-verified here.
- **Three two-hour cycles:** current app has dozens of functions/resources, custom
  OAuth, service-role ownership, billing/idempotency, agents/LLM, files, scheduled
  jobs and deletion behavior. A six-hour production migration is unsupported.
  Use one reviewed 45-minute slice at a time, measured against explicit evidence.

Illustrative capacity, not a price quote: 500 athletes × 5 activities/week × 2 MB
per original file × 52 weeks is approximately 260 GB/year of raw files. At one
hour per activity and 1 Hz, that is 468 million sample points/year. Keep original
recordings durable in private object storage; choose compressed/chunked stream
representations and SQL metadata/derived indexes deliberately. Do not assume
storing every point as a PostgreSQL row or giant JSON entity is free or efficient.

## Required design corrections

- Athlete IDs and auth user IDs are not automatically interchangeable. Model an
  explicit owner_user_id referencing auth.users and test owner/granted-coach/
  revoked/foreign/anonymous access. A blanket auth.uid() = athlete_id rule is only
  valid if that identity design is deliberate. Never migrate untrusted writable
  Base44 links into authority. Service-role bypass still needs server ownership.
- Four example tables do not cover the app. Inventory all current entities,
  files, provider identifiers/tokens, subscriptions, access-code events, consent,
  review acknowledgements, jobs and derived-data deletion/retention requirements.
- Preserve immutable raw checksums, native samples/timestamps/channels/laps and
  clear completeness/processing provenance. Maintain legitimate summary history;
  do not fabricate zones or convert download/parse failure into summary success.
- R2 buckets remain private. Authorize before scoped signed access; never expose
  R2 or Supabase service credentials to the browser. Preserve ownership and deletion
  across objects, decoded chunks and derived metrics.
- Provider authentication is contract-specific. Do not replace Garmin/COROS
  authentication with a generic invented HMAC. Register owned callbacks and verify
  the actually supported protocol/signature/token/refresh/retry behavior. The
  current COROS route is an MCP pull flow as well as separate webhook code.
- Local/staging must fail closed for real webhooks; never substitute a fake stream
  and report a real import successful. Synthetic fixture entry points are explicit.
- Vercel runtimes have duration/memory/payload/runtime limitations. Native FIT jobs
  may need asynchronous workers, bounded queues and idempotent retry, not a long
  synchronous edge request. Hono is a framework, not a durable queue or host.
- Preserve pure science functions and golden contracts, but do not assume all
  frontend/backend copies currently match. Explicitly compare units, initialization,
  time zones/constants, summary TRIMP, stream-zone load and impulse-response models.
- Local Supabase uses Docker and downloaded images. Its local storage service is
  not an R2 emulator; use an explicitly compatible local S3 fixture or adapter.
  After dependencies/images are cached, many tests can run offline; provider
  OAuth/live sync, Stripe, cloud deployment and hosted Codex API calls cannot.
- Auto-publishing every main push contradicts current release controls. Keep
  preview/CI, protected merge and separately approved production promotion distinct.

## Gated migration sequence

1. Inventory source/data/runtime dependencies and verify current pricing/terms,
   deployment/backup capabilities and a measured load/storage budget. No rewrite.
2. Prove one synthetic athlete vertical slice behind adapters: local auth/owner RLS,
   one original recording, normalized readback, deterministic analysis and dashboard.
3. Verify cross-owner denials, native fidelity, idempotent ingest, failure/retry,
   supported resource limits, backup/restore and deletion on that slice.
4. Expand incrementally to provider auth/recovery, billing, jobs, notifications,
   exports and account controls. Use separately authorized consenting provider pilots.
5. Rehearse exports/imports and compare complete component/data manifests. Resolve
   token/session migration or explicit reconnect requirements without secret exports
   into Git or logs. Retain independent review and a recoverable original system.
6. Only after explicit cutover approval, a tested rollback and an agreed window:
   promote hosting/backend, change DNS and verify the actual custom-domain journey.
   Do not cancel Base44 until export, ownership, billing, recovery and rollback
   requirements are met and the owner separately approves cancellation.

No calendar/cost guarantee is made. This milestone retains the full MVP roadmap,
Odysseus preservation and current production safeguards.

## Source verification limits

Official current pricing/terms requests were attempted but the cloud proxy denied
supabase.com, vercel.com and developers.cloudflare.com with CONNECT 403. Current
quotas/prices/plan eligibility are therefore NOT verified. Check these before any
purchase or commitment: https://supabase.com/pricing , https://vercel.com/pricing ,
https://vercel.com/docs/plans/hobby , https://developers.cloudflare.com/r2/pricing/ .
No approval is requested merely to record this candidate; actual infrastructure,
billing, real-data migration, DNS, deployment and decommission steps stay gated.
