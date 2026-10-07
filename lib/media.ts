export function youtubeEmbed(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id =
        url.searchParams.get("v") ||
        url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ||
        null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}
