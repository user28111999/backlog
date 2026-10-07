import type { Game } from "./game";
import { splitPlatforms } from "./platforms";

export function filterGames(
  games: Game[],
  search: string,
  status: string,
  platform: string,
  sort: string,
) {
  const [key, direction] = sort.split("-");
  return games
    .filter(
      (game) =>
        `${game.title} ${game.platform}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "ALL" || game.status === status) &&
        (platform === "ALL" ||
          splitPlatforms(game.platform).includes(platform)),
    )
    .sort((a, b) => {
      const av = a[key as keyof Game],
        bv = b[key as keyof Game];
      if (av == null || av === "") return bv == null || bv === "" ? 0 : 1;
      if (bv == null || bv === "") return -1;
      const comparison =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return direction === "asc" ? comparison : -comparison;
    });
}
