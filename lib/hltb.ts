import { z } from "zod";
import { providerFetch } from "./provider-fetch";

const entrySchema = z.object({
  hltbId: z.number().optional(),
  title: z.string(),
  steamAppId: z.number().nullable().optional(),
  mainStory: z.number().nullable().optional(),
  mainStoryWithExtras: z.number().nullable().optional(),
  completionist: z.number().nullable().optional(),
});
export const emptyTimes = {
  hltbMainStoryHours: null,
  hltbMainExtraHours: null,
  hltbCompletionistHours: null,
};
export type HltbTimes = { [K in keyof typeof emptyTimes]: number | null };
const normalize = (text: string) =>
  text.toLowerCase().replace(/[®™]/g, "").replace(/\s+/g, " ").trim();
const hours = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;

export function matchHltb(
  payload: unknown,
  title: string,
  steamAppId?: string,
): HltbTimes | null {
  const parsed = z
    .array(entrySchema)
    .safeParse(Array.isArray(payload) ? payload : [payload]);
  if (!parsed.success) throw new Error("Invalid HowLongToBeat response");
  const matches = parsed.data.filter((entry) =>
    steamAppId
      ? String(entry.steamAppId) === steamAppId
      : normalize(entry.title) === normalize(title),
  );
  if (matches.length !== 1) return null;
  const entry = matches[0];
  return {
    hltbMainStoryHours: hours(entry.mainStory),
    hltbMainExtraHours: hours(entry.mainStoryWithExtras),
    hltbCompletionistHours: hours(entry.completionist),
  };
}

export async function fetchHltb(
  title: string,
  steamAppId?: string,
): Promise<HltbTimes | null> {
  const base = (
    process.env.HLTB_API_URL || "https://hltbapi.codepotatoes.de"
  ).replace(/\/$/, "");
  async function request(path: string, init?: RequestInit) {
    const response = await providerFetch(`${base}${path}`, {
      ...init,
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error(`HowLongToBeat returned HTTP ${response.status}`);
    return response.json();
  }
  if (steamAppId) {
    const result = await request(`/steam/${encodeURIComponent(steamAppId)}`);
    if (result) {
      const match = matchHltb(result, title, steamAppId);
      if (match) return match;
    }
  }
  const results = await request("/hltb/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchTerm: title, matchType: 2, platform: "" }),
  });
  return results ? matchHltb(results, title) : null;
}
