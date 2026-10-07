# Dependencies, generated files, and external APIs

## Why is there code inside node_modules?

`node_modules` is npm's installation directory. Running `npm ci` downloads the dependencies declared in `package.json`, using the exact versions and integrity hashes in `package-lock.json`.

No new application package was authored or published inside that directory. The project's own code lives in `app`, `components`, `lib`, and `scripts`.

Prisma generates a database client under `node_modules/.prisma/client` from `prisma/schema.prisma`. The `@prisma/client` import in `lib/db.ts` uses that generated code to read and write games in SQLite.

| Location | Contents | Maintenance |
| --- | --- | --- |
| `package.json` | Dependencies and commands | Edit when intentionally changing project configuration |
| `package-lock.json` | Exact dependency versions and integrity hashes | Updated by npm; committed to Git |
| `node_modules/` | Installed third-party packages | Recreated by `npm ci`; ignored by Git |
| `node_modules/.prisma/client/` | Generated database client | Recreated by `npm run db:generate`; ignored by Git |
| `prisma/schema.prisma` | The database model | Application source; committed to Git |
| `scripts/prisma.cjs` | Custom Prisma setup helper | Application tooling; committed to Git |
| `prisma/dev.db` | Local game collection | Personal data; ignored by Git |

Do not edit installed or generated files manually: npm installation or Prisma generation can replace them.

## Why is there a custom Prisma setup helper?

During cloud setup, Prisma's standard CLI tried to download a native schema engine from `binaries.prisma.sh`. The network proxy returned HTTP 403. Switching to Prisma's SQLite adapter did not remove the CLI's download requirement.

The helper uses Prisma's own JavaScript generator and WebAssembly schema-engine packages, installed through npm, to generate the client and prepare SQLite without that native download. It does not implement a separate ORM or create a replacement package inside `node_modules`.

`npm run db:generate` generates the client. `npm run db:push` applies the schema to SQLite with destructive changes disabled (`force: false`) and reports schema warnings as failures. Here, “push” means applying a database schema; it has nothing to do with GitHub.

This is more specialized than the normal Prisma CLI. It uses programmatic/internal Prisma interfaces, so the related packages are pinned together at version 7.10.0 and must be updated and tested together. This workaround kept checksum and TLS verification enabled. Standard native CLI commands still require access to the engine-download host.

## Why is there a Twitch client secret?

It is for **IGDB**, the optional fallback for non-Steam games. The original specification requested IGDB through Twitch OAuth client credentials. IGDB uses Twitch-issued access tokens:

1. The server sends `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` to Twitch's token endpoint.
2. Twitch returns an access token.
3. The server sends that token to IGDB to request metadata, covers, and screenshots.

This is application authentication. The app has no Twitch login screen. No Twitch secret was created for you: `.env.example` contains empty placeholders, and the Codex configuration declares optional credentials to supply securely. Leave them unset if you do not need IGDB; manual game entry works and IGDB enrichment reports that it is unconfigured.

**HowLongToBeat does not use a Twitch client ID or secret.** Changing the HowLongToBeat integration would not replace IGDB's authentication requirement while the IGDB fallback remains enabled.

## Which services are used?

The orchestration code is in `app/api/games/enrich/route.ts`.

| Service | Purpose | Credentials |
| --- | --- | --- |
| Steam Store | Find Steam games; obtain release dates, screenshots, and trailers | No API key for the endpoints used here |
| SteamGridDB | Covers, heroes, and transparent logos | Optional `STEAMGRIDDB_API_KEY` |
| IGDB | Fallback metadata and artwork when no Steam game is found | Optional `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` |
| HowLongToBeat | Main story, main + extras, and completionist estimates | No Twitch or IGDB credentials |

The first version used the npm package `howlongtobeat-js`, as requested in the original specification. Purgatorio now calls Crashdummy's HowLongToBeat HTTP API directly, and that npm package and its declaration file have been removed. No HowLongToBeat scraper implementation is copied into this repository.

## What about Crashdummy/HowLongToBeatApi?

The user supplied the source archive for [Crashdummy/HowLongToBeatApi on Codeberg](https://codeberg.org/Crashdummy/HowLongToBeatApi), which resolved the earlier documentation-access blocker. It is an ASP.NET Core 10 service with SQLite/PostgreSQL caching, backed by a separate scraper dependency.

Its README documents a hosted service at `https://hltbapi.codepotatoes.de`. Purgatorio uses `GET /steam/{appId}` and `POST /hltb/search`, checks the returned game identity, and maps the actual completion-hour fields. Set `HLTB_API_URL` in `.env` to use a compatible self-hosted deployment. There is no .NET installation requirement for Purgatorio when calling an existing service.

See [the development guide](DEVELOPMENT.md) for a source walkthrough, endpoint table, and the differences between the API's cache and your personal library database.

## What has been verified?

The initial implementation passed a production build, seven API checks, and browser checks for CRUD, persisted ratings, search, status filtering, CSV export, and mobile layout. The screenshot lightbox and YouTube embed URL were also checked with mocked media responses.

The original cloud setup could not verify provider enrichment. After adding the API/Steam Community domains and making server requests honor the cloud proxy, live checks succeeded for Portal, Portal 2, and Elden Ring: HowLongToBeat estimates, Steam metadata, and SteamGridDB artwork were returned. The Steam screenshot button also added three public Portal 2 screenshots from the specified profile. IGDB remains unverified without Twitch credentials. These sampled checks do not mean every imported game has metadata.
