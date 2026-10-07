import { load } from "cheerio";
import { z } from "zod";
import { providerFetch } from "./provider-fetch";

const origin = "https://howlongtobeat.com";
const headers = {
  "Cache-Control": "no-cache, no-store",
  Pragma: "no-cache",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: `${origin}/`,
  Origin: origin,
};
const entrySchema = z.object({
  game_id: z.number().int().positive(),
  game_name: z.string(),
  comp_main: z.number().nonnegative().nullable().optional(),
  comp_plus: z.number().nonnegative().nullable().optional(),
  comp_100: z.number().nonnegative().nullable().optional(),
});
export const emptyTimes = {
  hltbMainStoryHours: null,
  hltbMainExtraHours: null,
  hltbCompletionistHours: null,
};
type Entry = z.infer<typeof entrySchema>;
type Fetcher = (
  url: string,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  headers: Pick<Headers, "getSetCookie">;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;
export class HltbProviderError extends Error {}
class HltbSessionError extends HltbProviderError {}
const hours = (seconds: number | null | undefined) =>
  seconds && Number.isFinite(seconds) ? Math.round(seconds / 36) / 100 : null;
const normalize = (title: string) =>
  title
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const estimates = (entry: Entry) => ({
  hltbId: String(entry.game_id),
  hltbMainStoryHours: hours(entry.comp_main),
  hltbMainExtraHours: hours(entry.comp_plus),
  hltbCompletionistHours: hours(entry.comp_100),
});

export function matchHltb(payload: unknown, title: string, id?: string) {
  const parsed = z.array(entrySchema).safeParse(payload);
  if (!parsed.success)
    throw new HltbProviderError(
      "HowLongToBeat returned an unexpected response. Saved estimates were kept.",
    );
  const matches = parsed.data.filter((entry) =>
    id
      ? String(entry.game_id) === id
      : normalize(entry.game_name) === normalize(title),
  );
  // Ambiguous searches require an explicit ID rather than guessed estimates.
  return matches.length === 1 ? estimates(matches[0]) : null;
}

export function parseHltbPage(html: string, id: string) {
  const text = load(html)("script#__NEXT_DATA__").text();
  if (!text)
    throw new HltbProviderError(
      "HowLongToBeat's game page format changed. Saved estimates were kept.",
    );
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HltbProviderError("HowLongToBeat returned an invalid game page.");
  }
  const game = data?.props?.pageProps?.game;
  const rows = game?.data?.game;
  if (Array.isArray(rows)) return matchHltb(rows, "", id);
  if (game?.count === 0 || data?.notFound === true) return null;
  throw new HltbProviderError(
    "HowLongToBeat's game page format changed. Saved estimates were kept.",
  );
}

export function findHltbSearchPath(script: string): string | null {
  const match = script.match(
    /fetch\s*\(\s*["'](\/api\/[a-zA-Z0-9_/]+)["']\s*,\s*\{[^}]*method\s*:\s*["']POST["']/i,
  );
  return match?.[1]?.replace(/\/$/, "") || null;
}

async function lookupHltb(
  title: string,
  id?: string,
  transport: Fetcher = providerFetch,
) {
  if (id && !/^[1-9]\d{0,15}$/.test(id))
    throw new HltbProviderError("Enter a valid numeric HowLongToBeat ID.");
  const signal = AbortSignal.timeout(25000);
  const cookies = new Map<string, string>();
  async function request(path: string, init: RequestInit = {}) {
    let response;
    try {
      response = await transport(`${origin}${path}`, {
        ...init,
        signal,
        cache: "no-store",
        headers: {
          ...headers,
          ...(cookies.size ? { Cookie: [...cookies.values()].join("; ") } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new HltbProviderError(
        signal.aborted
          ? "HowLongToBeat timed out. Saved estimates were kept; try again later."
          : "Cannot reach HowLongToBeat. Check your network; saved estimates were kept.",
      );
    }
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      cookies.set(pair.split("=")[0], pair);
    }
    if (response.status === 404) return null;
    if (
      (response.status === 401 || response.status === 403) &&
      /session expired|invalid fingerprint/i.test(await response.text())
    ) {
      throw new HltbSessionError(
        "HowLongToBeat rejected the search session. Try a manual HowLongToBeat ID; saved estimates were kept.",
      );
    }
    if (!response.ok)
      throw new HltbProviderError(
        response.status === 403 || response.status === 429
          ? `HowLongToBeat blocked this request (HTTP ${response.status}). Try again later or enter the estimates manually.`
          : `HowLongToBeat returned HTTP ${response.status}. Saved estimates were kept.`,
      );
    return response;
  }
  // ID lookup reads structured game-page data and never depends on title search.
  if (id) {
    const page = await request(`/game/${id}`);
    return page ? parseHltbPage(await page.text(), id) : null;
  }
  // Initialize the current endpoint first; the homepage can be blocked even
  // when search and individual game pages remain available.
  let path: string | null = "/api/search/site";
  let init = await request(`${path}/init?t=${Date.now()}`);
  if (!init) {
    const homepage = await request("/");
    if (!homepage)
      throw new HltbProviderError("HowLongToBeat's homepage was not found.");
    const $ = load(await homepage.text());
    const scripts = $("script[src]")
      .map((_, el) => $(el).attr("src"))
      .get()
      .map((src) => new URL(src, origin))
      .filter(
        (url) =>
          url.origin === origin &&
          url.pathname.startsWith("/_next/static/chunks/"),
      )
      .slice(0, 40);
    path = null;
    for (let index = 0; index < scripts.length && !path; index += 4) {
      const paths = await Promise.all(
        scripts.slice(index, index + 4).map(async (url) => {
          const script = await request(url.pathname);
          return script ? findHltbSearchPath(await script.text()) : null;
        }),
      );
      path = paths.find(Boolean) || null;
    }
    // The site's current client initializes a token; the old npm scraper tried
    // to concatenate a key extracted from an obsolete JavaScript bundle.
    path ||= "/api/s";
    init = await request(`${path}/init?t=${Date.now()}`);
  }
  if (!init)
    throw new HltbProviderError(
      "HowLongToBeat search initialization changed. Try a manual HowLongToBeat ID.",
    );
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let auth;
      try {
        auth = z.record(z.string(), z.unknown()).parse(await init.json());
      } catch {
        throw new HltbProviderError(
          "HowLongToBeat returned invalid search initialization data. Try a manual HowLongToBeat ID.",
        );
      }
      const token = z.string().min(1).safeParse(auth.token);
      if (!token.success)
        throw new HltbProviderError(
          "HowLongToBeat did not provide a search token. Try a manual HowLongToBeat ID.",
        );
      const key = Object.entries(auth).find(([name]) => /key/i.test(name))?.[1];
      const value = Object.entries(auth).find(([name]) =>
        /val/i.test(name),
      )?.[1];
      const challenge =
        typeof key === "string" &&
        key &&
        ["string", "number"].includes(typeof value)
          ? { [key]: value }
          : {};
      const result = await request(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token.data,
          ...(Object.keys(challenge).length
            ? { "x-hp-key": String(key), "x-hp-val": String(value) }
            : {}),
        },
        body: JSON.stringify({
          searchType: "games",
          searchTerms: title.trim().split(/\s+/),
          searchPage: 1,
          size: 20,
          searchOptions: {
            games: {
              userId: 0,
              platform: "",
              sortCategory: "popular",
              rangeCategory: "main",
              rangeTime: { min: 0, max: 0 },
              rangeYear: { min: "", max: "" },
              modifier: "",
              gameplay: {
                perspective: "",
                flow: "",
                genre: "",
                difficulty: "",
              },
            },
            users: { sortCategory: "postcount" },
            lists: { sortCategory: "follows" },
            filter: "",
            sort: 0,
            randomizer: 0,
          },
          useCache: true,
          ...challenge,
        }),
      });
      if (!result)
        throw new HltbProviderError(
          "HowLongToBeat's search endpoint changed. Try a manual HowLongToBeat ID.",
        );
      let payload;
      try {
        payload = z
          .object({ data: z.array(entrySchema) })
          .parse(await result.json());
      } catch {
        throw new HltbProviderError(
          "HowLongToBeat returned an unexpected search response. Saved estimates were kept.",
        );
      }
      return matchHltb(payload.data, title);
    } catch (error) {
      if (!(error instanceof HltbSessionError) || attempt === 1) throw error;
      // Refresh a rejected/expired token once instead of permanently failing
      // title searches. Other provider errors are not retried.
      init = await request(`${path}/init?t=${Date.now()}`);
      if (!init)
        throw new HltbProviderError(
          "HowLongToBeat search initialization changed.",
        );
    }
  }
  throw new HltbProviderError("HowLongToBeat search failed.");
}

export async function fetchHltb(
  title: string,
  id?: string,
  transport: Fetcher = providerFetch,
) {
  try {
    return await lookupHltb(title, id, transport);
  } catch (error) {
    if (error instanceof HltbProviderError) throw error;
    throw new HltbProviderError(
      "HowLongToBeat lookup failed. Saved estimates were kept; try again later.",
    );
  }
}
