# Coach guidance management recovery and accessibility

Existing PR #9. Refresh guidance now gives an actual recovery action after a
stale/conflicting save. Successful refresh clears selection and mutation errors;
failed refresh preserves selection, labels cached evidence and prevents clearing
until a successful read. Backend revision checks and ownership remain intact.
Escape and Keep close without writes and return keyboard focus to Manage.
Controls retain minimum 44px touch height, busy state and announced errors.

25 targeted tests pass, full suite 300 passed/four known COROS expected failures.
Typecheck/lint/build/backend validation pass with existing warnings. Chromium
synthetic dashboard: keyboard Escape/focus, refresh no-write/reselection,
individual clearing, reload, unselected guidance and workout preservation,
820px/390px overflow and zero page errors verified. Screenshot:
`docs/evidence/coach-guidance/recovery-ipad.png` (fixture, not hosted evidence).

Existing source computes advisory-only signals; no holdReason is generated and
conversation notices do not alter prescriptions. No confirmed restriction,
message, billing state, workout or backend authorization was changed. This does
not prove the currently published production frontend has the same behavior.

Required release steps remain exact-head CI/review, hosted acceptance, verified
component manifests/rollback and separate production approval. No production
writes or deployment. Staging publication, if verified, is recorded separately.
