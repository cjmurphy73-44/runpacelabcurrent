# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## MVP delivery and protected Odysseus project

- Use `docs/MVP_ATOMIC_BACKLOG.md` for stable task IDs, dependencies and evidence.
  Until merged, read it and the approved roadmap from `chore/codex-team-setup`;
  read the delivery contract/checkpoint from `fix/provider-connection-feedback`.
  Newer explicit user instructions take precedence. Complete one eligible item
  per run, maximum 45 minutes, using the owning existing PR and a writer lock.
- Treat Odysseus as a protected independent project. Do not delete, move, reset,
  clean, commit its unrelated local changes, or merge removal of its Git tracking
  without verified preservation of its files, modified/untracked content and
  independent history. A saved gitlink SHA is not a verified backup.
- Read `docs/ODYSSEUS_PRESERVATION.md` before any integration that includes its
  removal. Preserve existing Mac paths and launch dependencies; cloud repository
  access does not establish access to that Mac or its modified working copy.
- No production deployment/data changes, exposed credentials, self-approval or
  review/check bypass. Newer Product Owner direction on 9 November permits safe,
  isolated code and automated-test work while G0 isolation is being resolved;
  do not default to research-only runs when such a task is eligible. This does
  not waive security/billing/review/release gates, authorize real-provider pilots
  or establish staging isolation. Publish preview/staging only with verified
  isolation and authorization; production needs passed gates and separate explicit
  approval. Read the updated delivery contract on the existing provider branch.
