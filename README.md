# Base44 Project

Use this repository to run and edit the app locally, then publish changes back through Base44.

**Source and publishing are separate.** GitHub `main` is protected by PRs and CI, while this Base44 app's two-way sync attempts direct pushes to `main`. That push is currently blocked. Do not assume a GitHub merge reached the Builder or published app. See [atomic backlog](docs/MVP_ATOMIC_BACKLOG.md) and [release issue #24](https://github.com/cjmurphy73-44/runpacelabcurrent/issues/24).

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.

See the [Base44 CLI docs](https://docs.base44.com/developers/references/cli/get-started/overview) if you want to run Base44 commands directly.

## Run Locally

Run the full local development environment from the project root:

```bash
base44 dev
```

`base44 dev` starts the local Base44 development backend and, when this app is configured for it, also starts the frontend dev server for you. Use the frontend URL printed by the command.

For example, when the Base44 project config includes a `serveCommand`, `base44 dev` can launch the frontend too:

```json5
{
  "site": {
    "serveCommand": "npm run dev"
  }
}
```

In a Base44 project this lives in `base44/config.jsonc`.

## Run Only The Frontend

If you only want to work on the frontend against the hosted Base44 backend, run:

```bash
npm run dev
```

Open the local URL printed by Vite.

## Use The Hosted Backend

For frontend-only development, create or update `.env.local` in the project root:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

`VITE_BASE44_APP_ID` identifies the Base44 app.

`VITE_BASE44_APP_BASE_URL` sets the Base44 SDK API origin and app URL. Set both variables to the intended Base44 app when building for staging. The legacy names `VITE_APP_ID` and `VITE_APP_BASE_URL` remain supported. Without a configured backend URL, the SDK makes same-origin API requests.

When you use `base44 dev`, the command injects the local Base44 values for you, so `.env.local` is mainly needed for frontend-only workflows.

## Publish Your Changes

The published Base44 app serves `trainpacelab.com`. A GitHub merge and its Vercel deployment are separate from the Base44 release. Verify the reviewed source SHA, the built Base44 checkpoint, the private staging behaviour and the rollback checkpoint before using Publish in the Base44 dashboard. Follow the [release procedure](docs/WORKOUT_BACKEND_RELEASE.md) for the backend and permission cutover.

```bash
base44 dashboard open
```

## Docs & Support

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Base44 CLI command reference: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)

Support: [https://app.base44.com/support](https://app.base44.com/support)
