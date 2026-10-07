import { HowLongToBeat } from "howlongtobeat-js";
import { z } from "zod";

const entrySchema = z.object({
  gameName: z.string(),
  similarity: z.number(),
  mainStory: z.number().nullable().optional(),
  mainExtra: z.number().nullable().optional(),
  completionist: z.number().nullable().optional(),
});
export const emptyTimes = {
  hltbMainStoryHours: null,
  hltbMainExtraHours: null,
  hltbCompletionistHours: null,
};
export type HltbTimes = { [K in keyof typeof emptyTimes]: number | null };
const hours = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

export function matchHltb(payload: unknown): HltbTimes | null {
  const parsed = z.array(entrySchema).safeParse(payload);
  if (!parsed.success) throw new Error("Invalid HowLongToBeat response");
  const entry = parsed.data
    .filter((result) => result.similarity >= 0.8)
    .sort((a, b) => b.similarity - a.similarity)[0];
  if (!entry) return null;
  return {
    hltbMainStoryHours: hours(entry.mainStory),
    hltbMainExtraHours: hours(entry.mainExtra),
    hltbCompletionistHours: hours(entry.completionist),
  };
}

export async function fetchHltb(title: string): Promise<HltbTimes | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const results = await Promise.race([
      new HowLongToBeat(0.8).search(title),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("HowLongToBeat timed out")), 10000);
      }),
    ]);
    // The package returns null on network errors; only [] confirms no match.
    if (results === null) throw new Error("HowLongToBeat is unavailable");
    return matchHltb(results);
  } finally {
    clearTimeout(timer);
  }
}
