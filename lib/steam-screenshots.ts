import { load } from "cheerio";
import { providerFetch } from "./provider-fetch";

export function screenshotPage(appId: string) {
  return `https://steamcommunity.com/id/windowpeeper/screenshots/?appid=${encodeURIComponent(appId)}`;
}
export function parseScreenshotLinks(html: string): string[] {
  const $ = load(html);
  const ids = new Set<string>();
  $("a[href]").each((_, element) => {
    try {
      const url = new URL(
        $(element).attr("href")!,
        "https://steamcommunity.com",
      );
      const id = url.searchParams.get("id");
      if (
        url.hostname === "steamcommunity.com" &&
        url.pathname === "/sharedfiles/filedetails/" &&
        id &&
        /^\d+$/.test(id)
      )
        ids.add(id);
    } catch {
      /* Ignore unrelated links. */
    }
  });
  return [...ids]
    .slice(0, 12)
    .map(
      (id) => `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`,
    );
}
export function parseScreenshotImage(html: string): string | null {
  const $ = load(html);
  const value =
    $(".actualmedia").attr("href") ||
    $('meta[property="og:image"]').attr("content");
  if (!value) return null;
  try {
    const url = new URL(value);
    // Only accept actual Steam user-content images, not avatars or store artwork.
    if (
      url.protocol === "https:" &&
      /(^|\.)(steamusercontent\.com|steamuserimages-a\.akamaihd\.net)$/.test(
        url.hostname,
      )
    )
      return url.href;
  } catch {
    /* Invalid image URL. */
  }
  return null;
}
export async function fetchSteamScreenshots(appId: string): Promise<string[]> {
  async function html(url: string) {
    const response = await providerFetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Steam Community returned HTTP ${response.status}`);
    return response.text();
  }
  const links = parseScreenshotLinks(await html(screenshotPage(appId)));
  const screenshots: string[] = [];
  // Three concurrent requests at a time keeps this polite to Steam Community.
  for (let offset = 0; offset < links.length; offset += 3) {
    const batch = await Promise.allSettled(
      links
        .slice(offset, offset + 3)
        .map(async (link) => parseScreenshotImage(await html(link))),
    );
    for (const result of batch)
      if (result.status === "fulfilled" && result.value)
        screenshots.push(result.value);
  }
  return [...new Set(screenshots)];
}
