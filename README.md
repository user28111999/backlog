# Backlog

A Steam-inspired personal game library built with Next.js App Router, React, styled-components (SSR), SCSS, Prisma, and local SQLite. The library starts empty; no example games are inserted into your personal data.

## Get the code on your computer

Install [Git](https://git-scm.com/downloads) and [Node.js 24](https://nodejs.org/), then open a terminal and run:

```sh
git clone --branch proto https://github.com/user28111999/backlog.git
cd backlog
npm ci
npm run db:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000` in your computer's browser. Keep the terminal running while using the app; press Ctrl+C to stop it. No credentials or `.env` file are required for the basic local library. If the GitHub repository is private, Git will require your GitHub account's access.

To configure optional providers later, copy `.env.example` to `.env` and fill in only the services you need. On macOS/Linux use `cp .env.example .env`; on Windows PowerShell use `Copy-Item .env.example .env`. Do not overwrite an existing `.env` with your settings.

For later updates, run `git pull --ff-only` while on `proto`, then repeat `npm ci`, `npm run db:generate`, and `npm run db:push`. Stop the app first and back up `prisma/dev.db` before applying schema changes. Git downloads source code; it does not transfer your personal game database between computers.

## GitHub, Codex, and branch rules

Publishing a Codex environment saves its prepared machine and configuration. A Git **commit** records a version of the source code; a Git **push** uploads commits to GitHub. Environment publication does not perform those Git operations.

| Branch | Purpose | Push authorization |
| --- | --- | --- |
| `master` | Initial published baseline | The user authorized the initial push only. Every future push needs fresh explicit authorization. |
| `proto` | Ongoing development | Use this branch for future authorized development and pushes. |

Both branches start at the same commit. A branch is a name pointing to a commit, so creating `proto` does not copy another project directory. Later work on `proto` will leave `master` at its baseline until the user explicitly authorizes an update.

For development, check `git branch --show-current` returns `proto`. Use `git push origin proto` to publish work. The policy is recorded in [AGENTS.md](AGENTS.md) for future Codex sessions; it is not a GitHub branch-protection setting.

## Why these dependencies and credentials?

See [Dependencies, generated files, and external APIs](docs/DEPENDENCIES.md) for the full explanation of `node_modules`, Prisma's generated client and cloud setup workaround, the optional Twitch credentials used by IGDB, and the HowLongToBeat project suggested on Codeberg.

## Run

Use Node.js 22.12+ (tested with Node 24). From this checkout:

```sh
npm ci
# Optional: copy .env.example to .env if .env does not already exist.
npm run db:generate
npm run db:push
npm run dev
```

SQLite defaults to `file:./prisma/dev.db`, relative to the checkout. Keep that file to preserve your library. `DATABASE_URL` can override it. No API credentials are needed for manual game entry, editing, rating, filtering, or export.

For production: `npm run build`, then `npm start`. `npm run typecheck` validates TypeScript. With the server running, `npm run test:api` tests SQLite CRUD, input validation, and partial-update preservation; it removes its own test entry afterward. `TEST_BASE_URL` can select another test server.

The environment is already isolated: use this checkout; do not create an additional Git worktree unless requested.

## Features

- Responsive library sidebar with title/platform search, status and platform filters, and all ten requested sort orders. Unknown dates/ratings/estimates sort last.
- Add/edit dialog with an explicit metadata fetch action. Review fetched values before saving.
- Game details with artwork, Steam links, playtime comparisons, interactive rating, notes, mods, trailers, and screenshot lightbox.
- CSV export includes all database fields, JSON-encoded screenshots, escaped multiline text, and spreadsheet-formula protection.
- `GET/POST /api/games`, `GET/PATCH/DELETE /api/games/:id`, and `POST /api/games/enrich`.
- Database status identifiers map to friendly UI labels, including `REGULAR_ROTATION` → “Regular Rotation”. Dates use YYYY-MM-DD; times use hours.

## Optional metadata services

Set credentials in your deployment's secure environment settings or an ignored `.env` file. Never put credentials in `NEXT_PUBLIC_*` variables or source control.

| Provider | Configuration | Behavior |
| --- | --- | --- |
| Steam Store | No key | Exact-title search or a supplied Steam App ID; details, screenshots, trailers, release date, and default artwork |
| SteamGridDB | `STEAMGRIDDB_API_KEY` | Vertical grids, heroes, transparent logos for a matched Steam game |
| IGDB/Twitch | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | OAuth client-credentials exchange, then exact-title IGDB fallback for non-Steam games |
| HowLongToBeat | No key | `howlongtobeat-js` completion estimates; upstream changes or access controls may make this unavailable |

The server must reach `store.steampowered.com`, `www.steamgriddb.com`, `id.twitch.tv`, `api.igdb.com`, and `howlongtobeat.com`. Client artwork may use Steam CDN hosts, `images.igdb.com`, and image hosts returned by SteamGridDB. Provider failures return warnings and never prevent manual entry. Metadata is fetched on demand and persisted only when the user saves the game. Exact-title matching avoids silently importing a different game; use a Steam App ID when titles differ.

Live metadata was not verified in the onboarding machine: provider egress is restricted and optional credentials are absent. The app reports those failures. The environment draft includes the provider domains for review and publication.

## Prisma setup in restricted environments

`scripts/prisma.cjs` uses Prisma's version-pinned JavaScript generator and packaged WASM schema engine, with the SQLite adapter. This avoids the CLI's eager native-engine download from `binaries.prisma.sh`; npm package integrity checks remain enabled. `npm run db:push` calls the real Prisma schema engine with `force: false` and refuses destructive-change warnings. Back up your database before changing its schema. These programmatic Prisma packages are pinned together at 7.10.0; update and validate them together.

Native CLI workflows such as `npx prisma migrate dev` additionally require `binaries.prisma.sh`. The shipped development setup does not require that host.

This is a single-user local application with no account/authentication layer. The cloud development server should remain within its private environment; add authentication before a public deployment.
