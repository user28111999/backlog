"use client";
import { useEffect, useMemo, useState } from "react";
import { useLibrary } from "./LibraryContext";
import { filterGames } from "@/lib/library-filter";
import { statusLabel } from "@/lib/game";

export default function CollectionGrid() {
  const library = useLibrary();
  const [background, setBackground] = useState<string | null>(null);
  const games = useMemo(
    () =>
      filterGames(
        library.games,
        library.search,
        library.status,
        library.platform,
        library.sort,
      ),
    [
      library.games,
      library.search,
      library.status,
      library.platform,
      library.sort,
    ],
  );
  useEffect(() => {
    const candidates = library.games
      .filter(
        (g) =>
          g.status === "PLAYED" ||
          g.status === "FINISHED" ||
          (g.timePlayedHours ?? 0) > 0,
      )
      .flatMap((g) => g.gallery.filter(Boolean));
    setBackground((current) =>
      current && candidates.includes(current)
        ? current
        : candidates.length
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : null,
    );
  }, [library.games]);
  return (
    <section className="collection-home" aria-label="Game collection">
      {background && (
        <img
          className="collection-backdrop"
          src={background}
          alt=""
          onError={() => setBackground(null)}
        />
      )}
      <div className="collection-overlay" />
      <div className="collection-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL PURGATORIO</span>
          <h1>Your collection</h1>
          <p>
            {games.length} {games.length === 1 ? "game" : "games"}
            {games.length !== library.games.length
              ? ` of ${library.games.length}`
              : ""}
            . A world for every mood.
          </p>
        </div>
      </div>
      {games.length ? (
        <div className="collection-grid">
          {games.map((game) => (
            <button
              key={game.id}
              className="collection-tile"
              onClick={() => library.select(game.id)}
              aria-label={`Open ${game.title}${game.category ? ` · ${game.category}` : ""}`}
            >
              {game.coverUrl && (
                <img
                  src={game.coverUrl}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
              )}
              <div className="tile-shade" />
              <span
                className={`status-dot ${game.status}`}
                title={statusLabel[game.status]}
              />
              <div className="tile-caption">
                <small>{game.platform}</small>
                <strong>{game.title}</strong>
                <span>
                  {statusLabel[game.status]}
                  {game.category ? ` · ${game.category}` : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="collection-no-results">No games match your filters.</p>
      )}
    </section>
  );
}
