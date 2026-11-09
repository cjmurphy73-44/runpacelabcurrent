# Coach guidance: actual dashboard render with synthetic data

9 November 2026. Chromium, 820×1180 iPad-sized viewport. These are screenshots of
the application's actual React components and CSS running locally, with synthetic
HTTP fixtures and all external requests blocked. Not a mockup, hosted acceptance,
real athlete conversation, production deployment or clinical restriction removal.

- [Before](before-ipad.png): expandable all-at-once conversation acknowledgement.
- [Manage guidance](manage-ipad.png): choose individual notices, clear selected or
  keep them; large touch targets and keyboard-operable controls.
- [After clearing](cleared-ipad.png): confirmation with the saved running workout
  still available. Clearing does not delete a conversation or change a plan.

The browser exercise cleared one selected source, preserved the other, reloaded
and confirmed the cleared source stayed absent in the persistent test backend,
then cleared the remaining source. Keyboard Space/Enter and focus after success
worked. Both 820px and 390px views had no page overflow or page exception.
These checks do not establish real Base44 persistence, deployed endpoint presence,
RLS, hosted sign-in or production access.

`recovery-ipad.png`: local real dashboard with synthetic HTTP fixtures showing Refresh guidance; Escape focus restoration, refresh reselection, clear/reload and 390px overflow checks passed. Not hosted athlete evidence.
