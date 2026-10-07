# Coming back to this project after a few years

## npm install and npm run dev still do what you remember

They have different jobs: installation downloads libraries; development starts your application.

| Command | What it does | When to use it |
| --- | --- | --- |
| `npm install` | Installs dependencies. Uses the lockfile when it matches; can update the lockfile when dependency declarations change. | Working on dependency setup, or a project without a lockfile |
| `npm install some-package` | Adds a dependency and updates `package.json` and `package-lock.json`. | Deliberately adding a library |
| `npm ci` | Removes the existing `node_modules` installation and reinstalls the versions in `package-lock.json`. Requires a matching lockfile and does not rewrite it. | After cloning, or when reproducing the project's recorded dependency setup |
| `npm run dev` | Runs the command named `dev` in `package.json`: here, `next dev --hostname 0.0.0.0`. | Your normal coding session; the browser updates as you edit |
| `npm run build` | Generates Prisma's client, checks types, and builds the production app. | Checking that a change can be built for production |
| `npm start` | Runs the production build using `next start`. | After a successful build, rather than during normal editing |

The letters in `ci` come from “clean install”; the command is also useful for continuous-integration systems. It is not a replacement for `npm run dev`, and you do not need to reinstall dependencies every time you start coding.

`npm run anything` looks up `anything` in the `scripts` object of `package.json`. The names `dev`, `build`, `db:generate`, and `import:csv` are project scripts, not universal npm commands. `npm install` and `npm ci` are npm's own installation commands.

For example:

```json
{
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0",
    "db:generate": "node scripts/prisma.cjs generate"
  }
}
```

`npm run db:generate` therefore means “run this project's Prisma helper using Node.” It does not download your game library or push code to GitHub.

## First setup versus a normal coding day

First setup, in the cloned repository:

```sh
npm ci
npm run db:generate
npm run db:push
npm run dev
```

On a normal day:

```sh
npm run dev
```

Open `http://localhost:3000` in your browser. Stop the server with Ctrl+C. Keep your `.env` file and `prisma/dev.db`: they hold local configuration and personal data, respectively.

After pulling changes, reinstall if dependencies changed; regenerate/apply the database schema if the schema changed. `db:generate` creates the database-access code; `db:push` prepares or updates SQLite tables. See [DEPENDENCIES.md](DEPENDENCIES.md) for why this cloud setup uses a custom Prisma helper.

## Importing your spreadsheet on another computer

The uploaded CSV was imported into the cloud workspace's SQLite database. GitHub carries the code, not your personal database or uploaded CSV. On your computer, either use **Import CSV** in the header or run:

```sh
npm run import:csv -- "/path/to/GAME LIST - Game List.csv"
```

On Windows the path might be `"C:\Users\you\Downloads\GAME LIST - Game List.csv"`. The `--` tells npm to pass the remaining arguments to the import script.

The expected columns are `Category`, `Status`, `Game Title`, `Platform`, `Input Method`, `Modded`, and `Additional Notes`. Quoted commas and multiline notes are supported. Import validates the complete file before writing and uses a database transaction. Repeating the same import skips rows already imported. Distinct rows with the same game title stay distinct, including different categories.

Unknown modding values stay unknown. Absent playtimes, ratings, dates, estimates, and media stay empty. The import does not invent gameplay hours. You can use `--dry-run` to validate a file without importing it.

## What the uploaded HowLongToBeat project is

The uploaded archive contains a **C# / ASP.NET Core 10 HTTP API**, not a JavaScript npm package. Its README documents a hosted demo at `https://hltbapi.codepotatoes.de` and interactive endpoint documentation at `/scalar`. You can also run that service yourself with .NET 10.

Purgatorio calls this service over HTTP. That means you do not need to install .NET to run Purgatorio when using the hosted service. `HLTB_API_URL` can select your own compatible deployment. Purgatorio uses the endpoint contract; it does not copy the uploaded C# implementation into `node_modules`.

### Following one request through the C# code

Suppose the client calls `GET /steam/620`:

1. **`Program.cs` starts the server.** It registers the database, HTTP client, title-lookup service, and HowLongToBeat scraper. It applies database migrations, registers routes, and starts listening.
2. **`HowLongToBeatController.cs` receives the request.** `app.MapGet("/steam/{appId}", GetFromSteamAppId)` connects that URL to the handler. This is the same role as a Next.js route handler.
3. **The handler checks its database cache.** An entry with that Steam ID can be returned without another lookup.
4. **`TitleLookup.cs` resolves the Steam ID to a title** through Steam's store API if the cache misses. GOG lookup similarly uses GOGDB.
5. **`Codepotatoes.Scraper.HowLongToBeat` searches HowLongToBeat.** This is a separate dependency referenced in the `.csproj`; its full implementation is not in the uploaded archive.
6. **`GameEntryConverter.cs` converts the scraper's model into the API's model.** `FindGame` inserts or updates suitable results in the cache, then the handler returns the matching game as JSON.

`async`/`await` serves the same purpose as in JavaScript: wait for network or database operations without blocking the request thread. `Task<IResult>` means the method asynchronously produces an HTTP result. `Results.Ok(...)`, `Results.NotFound(...)`, and `Results.BadRequest(...)` correspond to HTTP 200, 404, and 400 responses.

The framework supplies the handler's `HltbDbContext`, `ITitleLookup`, and scraper parameters. This is dependency injection: the handler declares what it needs and the startup registrations tell the framework how to construct it.

### The main files

| File/directory in the archive | Responsibility |
| --- | --- |
| `src/Api/HowLongToBeatApi.csproj` | .NET target version and NuGet dependencies; comparable to the dependency portion of `package.json` |
| `src/Api/Program.cs` | Application startup, service registration, database setup, and route registration |
| `Controllers/HowLongToBeatController.cs` | HTTP endpoints and cache/search orchestration |
| `Models/GameEntry.cs` | Fields returned by the API: IDs, title, cover URL, completion hours, and last-update time |
| `Payloads/HltbSearchPayload.cs` | Search input: `searchTerm`, `matchType`, and optional `platform` |
| `Services/TitleLookup.cs` | Gets game titles from Steam IDs or GOG IDs |
| `Services/HltbDbContext.cs` | Entity Framework database access; SQLite by default, with PostgreSQL support |
| `Migrations/` | Versioned changes to the API's database tables |
| `tests/UnitTests/TitleLookupTests.cs` | Checks title lookup against real Steam/GOG services; these are network-dependent checks despite the directory name |

The API's database caches shared game metadata. Your Purgatorio database stores your own statuses, platforms, notes, ratings, and playtime. They serve different purposes.

### Endpoints and response mapping

| Endpoint | Purpose | Successful response |
| --- | --- | --- |
| `GET /steam/{appId}` | Look up a Steam game | One game object |
| `GET /gog/{appId}` | Look up a GOG game | One game object |
| `GET /hltb/{id}` | Look up a HowLongToBeat ID | One game object |
| `GET /hltb/{id}/refresh` | Refresh a cached entry | One game object |
| `POST /hltb/search` | Search by title | An array of game objects |

Purgatorio tries the Steam ID when available, otherwise an exact-title search. It maps `mainStory`, `mainStoryWithExtras`, and `completionist` to its three estimate columns. These are hours. Missing or zero estimates stay blank; they never overwrite **Your playtime**.

The uploaded README and source differ in a few details: the README broadly describes array results, but the ID endpoints return an object. The README mentions a small-result caching threshold that is not enforced in the controller's current `FindGame` implementation. The client follows the source's actual response shapes. Cached entries are not automatically expired by this controller; the refresh endpoint exists for updating them.

Purgatorio automatically fetches estimates when you view a game and caches a successful lookup, including a confirmed no-match, for 24 hours. The add/edit form automatically fetches estimates and available artwork after the title or Steam ID settles. Existing artwork is preserved during automatic requests, and stale requests are cancelled when you change the title.

## Screenshots, platforms, and credentials

Platform chips accept commas, Enter, keyboard navigation, and custom platform names. Both the sidebar and collection grid filter individual platforms. Clicking the selected sidebar game again, the brand, or **My library** returns to the square-tile collection view. Its background uses a real screenshot from a played/finished game or a game with recorded playtime; there is no fabricated background image when none exists.

For a Steam game, **Fetch Steam screenshots** reads the public `windowpeeper` screenshot page for its app ID and adds actual Steam user-content image URLs. It does not treat the community-page URL itself as an image, and it does not substitute store screenshots when that profile has none. The separate Steam metadata lookup can supply official store screenshots.

Twitch credentials remain optional and belong in your ignored `.env` file. They authenticate **IGDB** for fallback artwork, not HowLongToBeat or Steam screenshots. Existing credentials are preserved; missing ones are never invented or committed.
