# TrainPaceLab engineering team

The Product Owner sets priorities and release decisions. Engineering Lead assigns
one task to a worker, QA challenges the exact result, and the lead records a
verified checkpoint. The initial execution team is engineering-lead,
platform-engineer and qa-reviewer. competitive-intelligence is an on-demand,
read-only research role. Later implementation specialists are activated only
when their roadmap gates and user authorization permit it.

## Install and first run

1. Fetch the reviewed setup branch into a dedicated local worktree. Preserve the
   original main checkout, local config and modified odysseus item.
2. Open/start Codex in that worktree so project-scoped .codex/agents/*.toml files
   are available. Existing active sessions may need a restart to discover files.
3. Inspect parent-session permissions and tool access. Custom agent path scopes
   are instructions, NOT filesystem/network security boundaries. These files
   intentionally do not override sandbox/approval policy, models or credentials.
4. Ask: "Have engineering-lead execute .codex/prompts/development-cycle.md for
   TPL-001, delegating the bounded platform task and QA review. Do not deploy
   production or start later gates. Return acceptance evidence."
5. Verify actual delegation, target worktree, test commands and reports in the
   local session. Cloud review is useful but does not prove the Mac setup works.
6. Attach the same prompt to a desktop scheduled task for this local project,
   every TWO hours, with isolated worktrees. Test one manual run first. Do not
   run a second writer against a branch already owned by an interactive session.

The existing web GitHub checker is read-only oversight. It is not this local
coding runner. Committing these files does not schedule or authenticate anything.
Keep local application/computer available for local scheduled work.

## Working agreements

- AGENTS.md and newer explicit Product Owner directions remain authoritative.
- docs/DEVELOPMENT_ROADMAP.md defines the seven gates and completion criteria.
- assignments/TEMPLATE.md is the contract; TPL-001.md is the first live task.
- docs/MVP_RELEASE_CRITERIA.md defines the Garmin/COROS launch promise.
- competitive-intelligence researches public product/market evidence and returns
  at most three validated opportunities per brief. TPL-RESEARCH-001.md is queued;
  it does not grant account-creation, purchasing or implementation authority.
- Put sanitized dated handoffs in reports/. Never commit private environment
  identifiers, raw athlete data, keys, sessions or authentication output.
- Source/build warnings are disclosed; failures are not hidden or waived.
- Automated review cannot replace required independent human PR approval.
- Runtime tests use verified isolated staging and synthetic/sandbox data only.
- No new dependency, platform migration or feature scope without an approved task.

## Competitive research

Ask engineering-lead to dispatch competitive-intelligence on
assignments/TPL-RESEARCH-001.md when a product decision needs evidence. Compare
capabilities, onboarding, pricing, integrations, messaging and credible public
user feedback. Separate observed behavior, marketing claims and inference.
Recommendations go to the Product Owner; they do not become engineering tasks
until approved. Research is on demand; no separate market schedule is enabled.

## Future platform independence

Vercel frontend hosting and replacing Base44's backend are separate milestones.
See the portability section of the roadmap. Do not migrate during Gate 0 or assume
existing Vercel previews establish independent auth, storage, jobs or billing.

## Configuration reference

Official custom-agent schema: https://learn.chatgpt.com/docs/agent-configuration/subagents
Scheduling/environment guidance: https://learn.chatgpt.com/docs/automations
Validate discovery and behavior against the installed Codex version before use.
