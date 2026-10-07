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

`npm run anything` looks up `anything` in the `scripts` object of `package.json`. The names `dev`, `build`, `db:generate`, and `db:seed` are project scripts, not universal npm commands. `npm install` and `npm ci` are npm's own installation commands.

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
npm run db:seed
npm run dev
```

On a normal day:

```sh
npm run dev
```

Open `http://localhost:3000` in your browser. Stop the server with Ctrl+C. Keep your `.env` file and `prisma/dev.db`: they hold local configuration and personal data, respectively.

After pulling changes, reinstall if dependencies changed; regenerate/apply the database schema if the schema changed. `db:generate` creates the database-access code; `db:push` prepares or updates SQLite tables. See [DEPENDENCIES.md](DEPENDENCIES.md) for why this cloud setup uses a custom Prisma helper.

## Loading your game list on another computer

Your full 750-entry list is embedded in `scripts/game-list.ts`. The executable script is `scripts/seed-games.tsx`; it inserts those entries directly into SQLite. No file upload or import/export controls are needed.

After installing dependencies and preparing the database, run:

```sh
npm run db:seed
npm run dev
```

You can run the seed command again safely: it adds missing entries and preserves existing edits, ratings, artwork, and playtime. Repeated titles in different categories and repeated source rows stay separate. Keys from the previous import are retained so existing collections are not duplicated.

The list preserves supplied statuses, platforms, input methods, modding values, categories, and notes. Unknown values stay blank. Completion estimates and media are fetched separately from their actual providers.

GitHub carries the embedded list and script. Your local SQLite database still stores subsequent personal edits and should be backed up separately. You can edit the embedded list before its first load; changing an already-loaded entry there does not overwrite that entry in the database—use the game's edit form for that.

## How completion times are fetched

Purgatorio uses `howlongtobeat-js`, the same npm package as the first version. It contacts HowLongToBeat directly from the server; no separate .NET service or API URL is needed.

`lib/hltb.ts` searches by game title, selects the highest similarity result with a score of at least 0.8, and maps `mainStory`, `mainExtra`, and `completionist` into the three estimate columns. These values are hours. Missing or zero estimates stay blank and never overwrite **Your playtime**. A failed request preserves saved estimates instead of treating a network error as a confirmed missing game. Similar titles can still produce incorrect matches, so review fetched values before saving.

Purgatorio automatically fetches estimates when you view a game and caches a successful lookup, including a confirmed no-match, for 24 hours. The add/edit form automatically fetches estimates and available artwork after the title or Steam ID settles. Existing artwork is preserved during automatic requests, and stale requests are cancelled when you change the title.

## Screenshots, platforms, and credentials

Platform chips accept commas, Enter, keyboard navigation, and custom platform names. Both the sidebar and collection grid filter individual platforms. Clicking the selected sidebar game again, the brand, or **My library** returns to the square-tile collection view. Its background uses a real screenshot from a played/finished game or a game with recorded playtime; there is no fabricated background image when none exists.

For a Steam game, **Fetch Steam screenshots** reads the public `windowpeeper` screenshot page for its app ID and adds actual Steam user-content image URLs. It does not treat the community-page URL itself as an image, and it does not substitute store screenshots when that profile has none. The separate Steam metadata lookup can supply official store screenshots.

Twitch credentials remain optional and belong in your ignored `.env` file. They authenticate **IGDB** for fallback artwork, not HowLongToBeat or Steam screenshots. Existing credentials are preserved; missing ones are never invented or committed.
