"use client";
import { useEffect, useMemo, useRef, useState, useId } from "react";
import styled from "styled-components";
import {
  Gamepad2,
  Search,
  Plus,
  Library,
  ChevronDown,
  ArrowUpDown,
  Clock3,
  Star,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Sparkles,
  Monitor,
  Check,
  ArrowRight,
  ImageIcon,
  Layers,
  Keyboard,
  Play,
  LoaderCircle,
} from "lucide-react";
import { LibraryProvider, useLibrary } from "./LibraryContext";
import { Game, GameInput, statuses, statusLabel } from "@/lib/game";
import { youtubeEmbed } from "@/lib/media";
import { splitPlatforms } from "@/lib/platforms";
import { filterGames } from "@/lib/library-filter";
import PlatformInput from "./PlatformInput";
import CollectionGrid from "./CollectionGrid";
const Button = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #46484f;
  background: ${(p) => (p.$primary ? "linear-gradient(110deg,#46484f,#3a3c44)" : "#2b2d35")};
  color: #f0eff2;
  padding: 10px 15px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    filter 0.15s,
    transform 0.15s;
  white-space: nowrap;
  &:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  svg {
    width: 15px;
    height: 15px;
  }
`;
function Art({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={`${className || ""} art-placeholder`}>
      <Gamepad2 />
    </span>
  );
}
export function Header({ onAdd }: { onAdd: () => void }) {
  const { search, setSearch, select } = useLibrary();
  return (
    <header className="header">
      <a
        className="brand"
        href="/"
        aria-label="Purgatorio home"
        onClick={(e) => {
          e.preventDefault();
          select(null);
        }}
      >
        <span className="brand-icon">
          <Layers size={22} />
        </span>
        PURGATORIO<span className="brand-dot">.</span>
      </a>
      <nav>
        <span className="active-nav">LIBRARY</span>
        <span className="nav-caption">Your games. Your journey.</span>
      </nav>
      <div className="header-actions">
        <label className="search">
          <Search size={16} />
          <input
            placeholder="Search your library…"
            aria-label="Search games or platforms"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd>⌕</kbd>
        </label>
        <Button $primary onClick={onAdd}>
          <Plus />
          Add Game
        </Button>
      </div>
    </header>
  );
}
const sorts = [
  ["title-asc", "Title · A to Z"],
  ["title-desc", "Title · Z to A"],
  ["releaseDate-desc", "Release · Newest"],
  ["releaseDate-asc", "Release · Oldest"],
  ["rating-desc", "Rating · Highest"],
  ["rating-asc", "Rating · Lowest"],
  ["timePlayedHours-desc", "Playtime · Most"],
  ["timePlayedHours-asc", "Playtime · Least"],
  ["hltbMainStoryHours-asc", "Main story · Shortest"],
  ["hltbMainStoryHours-desc", "Main story · Longest"],
];
export function Sidebar({ onAdd }: { onAdd: () => void }) {
  const l = useLibrary();
  const filtered = useMemo(
    () => filterGames(l.games, l.search, l.status, l.platform, l.sort),
    [l.games, l.search, l.status, l.platform, l.sort],
  );
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <Library size={18} />
        <h2>
          <button
            className="library-home-button"
            onClick={() => l.select(null)}
          >
            My library
          </button>
        </h2>
        <span className="count">{l.games.length}</span>
      </div>
      <div className="filters">
        <div className="filter-line">
          <select
            aria-label="Filter by status"
            value={l.status}
            onChange={(e) => l.setStatus(e.target.value)}
          >
            <option value="ALL">All games</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by platform"
            value={l.platform}
            onChange={(e) => l.setPlatform(e.target.value)}
          >
            <option value="ALL">All platforms</option>
            {[...new Set(l.games.flatMap((g) => splitPlatforms(g.platform)))]
              .sort()
              .map((p) => (
                <option key={p}>{p}</option>
              ))}
          </select>
        </div>
        <label className="sort">
          <ArrowUpDown size={13} />
          <select
            aria-label="Sort games"
            value={l.sort}
            onChange={(e) => l.setSort(e.target.value)}
          >
            {sorts.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="list-caption">
        YOUR COLLECTION <span>{filtered.length} GAMES</span>
      </div>
      <GameList games={filtered} />
      {!filtered.length && !l.loading && (
        <div className="list-empty">
          {l.games.length
            ? "No games match your filters."
            : "Every great collection starts with one game."}
        </div>
      )}
      <button className="sidebar-add" onClick={onAdd}>
        <Plus size={16} /> Add to your library
      </button>
      <div className="sidebar-footer">
        <span className="online-dot" /> PERSONAL LIBRARY <span>LOCAL</span>
      </div>
    </aside>
  );
}
export function GameList({ games }: { games: Game[] }) {
  const { selected, select } = useLibrary();
  return (
    <div className="game-list">
      {games.map((g) => (
        <button
          key={g.id}
          className={`game-row ${selected === g.id ? "selected" : ""}`}
          onClick={() => select(selected === g.id ? null : g.id)}
          aria-pressed={selected === g.id}
        >
          <Art src={g.coverUrl} alt="" className="game-thumb" />
          <span className="game-row-info">
            <strong>{g.title}</strong>
            <small>
              {g.platform}
              {g.timePlayedHours != null && (
                <>
                  <span>·</span>
                  {g.timePlayedHours} hrs
                </>
              )}
            </small>
          </span>
          <span
            title={statusLabel[g.status]}
            className={`status-dot ${g.status}`}
          />
        </button>
      ))}
    </div>
  );
}
export function HLTBCard({ game: g }: { game: Game }) {
  const { refresh } = useLibrary();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (
      g.hltbFetchedAt &&
      Date.now() - new Date(g.hltbFetchedAt).getTime() < 86400000
    ) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setMessage("");
    fetch(`/api/games/${g.id}/hltb`, {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) await refresh();
      })
      .catch((error) => {
        if (!controller.signal.aborted) setMessage(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [g.id, g.hltbFetchedAt, refresh]);
  const values = [
    { name: "Your playtime", value: g.timePlayedHours, own: true },
    { name: "Main story", value: g.hltbMainStoryHours },
    { name: "Main + extras", value: g.hltbMainExtraHours },
    { name: "Completionist", value: g.hltbCompletionistHours },
  ];
  const max = Math.max(1, ...values.map((v) => v.value || 0));
  return (
    <section className="card time-card">
      <div className="section-heading">
        <h3>
          <Clock3 size={16} /> Time well spent
        </h3>
        <a
          href={`https://howlongtobeat.com/?q=${encodeURIComponent(g.title)}`}
          target="_blank"
          rel="noreferrer"
        >
          HOWLONGTOBEAT <ExternalLink size={11} />
        </a>
      </div>
      <div className="time-grid">
        {values.map((v) => (
          <div key={v.name} className={v.own ? "own-time" : ""}>
            <span>{v.name}</span>
            <strong>
              {v.value ?? ""}
              <small>{v.value != null ? " hrs" : ""}</small>
            </strong>
            <div className="meter">
              <i style={{ width: `${((v.value || 0) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="card-footnote">
        {loading
          ? "Fetching HowLongToBeat estimates…"
          : message ||
            "HowLongToBeat estimates are separate from your recorded playtime."}
      </p>
    </section>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function GameDetail({
  game: g,
  onEdit,
}: {
  game: Game;
  onEdit: () => void;
}) {
  const { save, remove, refresh } = useLibrary();
  const [screenshotsBusy, setScreenshotsBusy] = useState(false);
  const [screenshotMessage, setScreenshotMessage] = useState("");
  const embedUrl = youtubeEmbed(g.trailerUrl);
  const [lightbox, setLightbox] = useState<string | null>(null),
    [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setError("");
    setDeleting(false);
    setLightbox(null);
    setScreenshotMessage("");
  }, [g.id]);
  async function rate(rating: number | null) {
    setBusy(true);
    try {
      await save({ rating }, g.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="detail">
      <div className="hero">
        <Art src={g.heroUrl || g.coverUrl} alt="" className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-breadcrumb">
          YOUR LIBRARY <span>/</span> {g.platform.toUpperCase()}
        </div>
        <div className="hero-content">
          <span className={`status-pill ${g.status}`}>
            <span className={`status-dot ${g.status}`} />
            {statusLabel[g.status]}
          </span>
          {g.logoUrl && (
            <Art
              src={g.logoUrl}
              alt={`${g.title} logo`}
              className="game-logo"
            />
          )}
          <h1>{g.title}</h1>
          {g.category && <span className="category-label">{g.category}</span>}
          <div className="hero-meta">
            <span>
              <Monitor size={14} />
              {g.platform}
            </span>
            {g.releaseDate && (
              <span>
                Released{" "}
                {new Date(g.releaseDate + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </span>
            )}
            <span>{g.inputMethod}</span>
          </div>
        </div>
      </div>
      <div className="action-bar">
        <Button $primary onClick={onEdit}>
          <Pencil />
          Edit Game
        </Button>
        {g.steamAppId && (
          <div className="steam-links">
            {[
              [
                "Store Page",
                `https://store.steampowered.com/app/${g.steamAppId}`,
              ],
              [
                "Discussions",
                `https://steamcommunity.com/app/${g.steamAppId}/discussions/`,
              ],
              [
                "Guides",
                `https://steamcommunity.com/app/${g.steamAppId}/guides/`,
              ],
            ].map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noreferrer">
                {label}
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        )}
        <button
          className="delete-button"
          onClick={() => setDeleting(true)}
          aria-label="Delete game"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="detail-body">
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <HLTBCard game={g} />
        <div className="detail-columns">
          <section className="card review-card">
            <div className="section-heading">
              <h3>
                <Star size={16} /> Your review
              </h3>
              <button className="text-button" onClick={onEdit}>
                Edit review <Pencil size={12} />
              </button>
            </div>
            <div className="rating">
              <div>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    disabled={busy}
                    key={n}
                    aria-label={`Rate ${n} stars`}
                    aria-pressed={g.rating === n}
                    onClick={() => rate(g.rating === n ? null : n)}
                  >
                    <Star
                      size={24}
                      fill={(g.rating || 0) >= n ? "#e8c071" : "transparent"}
                      color={(g.rating || 0) >= n ? "#e8c071" : "#536073"}
                    />
                  </button>
                ))}
              </div>
              <span>{g.rating ? `${g.rating} / 5` : "Not rated yet"}</span>
            </div>
            <p className="notes">
              {g.reviewNotes ||
                "What stayed with you? Add your thoughts, favorite moments, and little discoveries."}
            </p>
          </section>
          <section className="card tech-card">
            <div className="section-heading">
              <h3>
                <Keyboard size={16} /> The setup
              </h3>
            </div>
            <dl>
              <div>
                <dt>Input method</dt>
                <dd>{g.inputMethod}</dd>
              </div>
              <div>
                <dt>Modded</dt>
                <dd className={g.isModded ? "blue" : ""}>
                  {g.isModded == null
                    ? "Unknown"
                    : g.isModded
                      ? "Yes · Customized"
                      : "No · Vanilla"}
                </dd>
              </div>
            </dl>
            {g.isModded && (
              <details>
                <summary>
                  Mod notes <ChevronDown size={12} />
                </summary>
                <p className="notes">{g.modNotes || "No mod notes yet."}</p>
              </details>
            )}
            {g.additionalNotes && (
              <p className="notes additional">{g.additionalNotes}</p>
            )}
          </section>
        </div>
        <section className="media-section">
          <div className="section-heading">
            <h3>
              <ImageIcon size={16} /> A glimpse into the world
            </h3>
            <span>{g.gallery.length} SCREENSHOTS</span>
          </div>
          {g.steamAppId && (
            <div className="screenshot-actions">
              <Button
                disabled={screenshotsBusy}
                onClick={async () => {
                  setScreenshotsBusy(true);
                  setScreenshotMessage("");
                  try {
                    const response = await fetch(
                      `/api/games/${g.id}/screenshots`,
                      { method: "POST" },
                    );
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);
                    await refresh();
                    setScreenshotMessage(
                      result.message || `Added ${result.added} screenshots.`,
                    );
                  } catch (error) {
                    setScreenshotMessage((error as Error).message);
                  } finally {
                    setScreenshotsBusy(false);
                  }
                }}
              >
                <ImageIcon />
                {screenshotsBusy
                  ? "Fetching screenshots…"
                  : "Fetch Steam screenshots"}
              </Button>
              <a
                href={`https://steamcommunity.com/id/windowpeeper/screenshots/?appid=${g.steamAppId}`}
                target="_blank"
                rel="noreferrer"
              >
                windowpeeper’s screenshots <ExternalLink size={12} />
              </a>
            </div>
          )}
          {screenshotMessage && (
            <p className="field-hint" role="status">
              {screenshotMessage}
            </p>
          )}
          {g.trailerUrl &&
            (embedUrl ? (
              <iframe
                className="youtube-player"
                src={embedUrl}
                title={`${g.title} trailer`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <video
                src={g.trailerUrl}
                controls
                preload="none"
                poster={g.heroUrl}
                aria-label={`${g.title} trailer`}
              />
            ))}
          <div className="gallery">
            {g.gallery.map((url, i) => (
              <button
                key={url + i}
                onClick={() => setLightbox(url)}
                aria-label={`Open screenshot ${i + 1}`}
              >
                <Art src={url} alt={`${g.title} screenshot ${i + 1}`} />
                <span>View screenshot ↗</span>
              </button>
            ))}
          </div>
          {!g.gallery.length && !g.trailerUrl && (
            <div className="media-empty">
              <ImageIcon size={26} />
              <span>This world is waiting to be discovered.</span>
              <button className="text-button" onClick={onEdit}>
                Add media or fetch metadata <ArrowRight size={13} />
              </button>
            </div>
          )}
        </section>
        <footer className="detail-footer">
          PART OF YOUR STORY{" "}
          <span>
            Added{" "}
            {new Date(g.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </footer>
      </div>
      {lightbox && (
        <Modal title="Screenshot" onClose={() => setLightbox(null)} wide>
          <img
            className="lightbox-image"
            src={lightbox}
            alt={`${g.title} screenshot`}
          />
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Remove from your library?"
          onClose={() => setDeleting(false)}
        >
          <p>
            Your entry for <strong>{g.title}</strong>, including its notes and
            playtime, will be permanently deleted.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setDeleting(false)}>Keep game</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await remove(g.id);
                } catch (e) {
                  setError((e as Error).message);
                  setDeleting(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 />
              Delete game
            </Button>
          </div>
        </Modal>
      )}
    </article>
  );
}
const initial: GameInput = {
  title: "",
  status: "INTERESTED",
  platform: "PC",
  timePlayedHours: null,
  rating: null,
  inputMethod: "Keyboard & Mouse",
  isModded: false,
  coverUrl: "",
  heroUrl: "",
  logoUrl: "",
  trailerUrl: "",
  gallery: [],
};
export function EnrichmentModal({
  game,
  onClose,
}: {
  game?: Game;
  onClose: () => void;
}) {
  const { save, games } = useLibrary();
  const [form, setForm] = useState<GameInput>(game ? { ...game } : initial),
    [busy, setBusy] = useState(false),
    [enriching, setEnriching] = useState(false),
    [error, setError] = useState(""),
    [messages, setMessages] = useState<string[]>([]);
  const set = (key: keyof GameInput, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function enrich(signal?: AbortSignal, automatic = false) {
    setEnriching(true);
    setError("");
    setMessages([]);
    try {
      const r = await fetch("/api/games/enrich", {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          steamAppId: form.steamAppId || undefined,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      if (signal?.aborted) return;
      setForm((f) => {
        if (f.title !== form.title || f.steamAppId !== form.steamAppId)
          return f;
        const patch = { ...result.data };
        delete patch.title;
        // Never replace existing artwork automatically or clear it after an upstream failure.
        if (automatic)
          for (const key of [
            "coverUrl",
            "logoUrl",
            "heroUrl",
            "trailerUrl",
            "gallery",
          ] as const) {
            if (key === "gallery" ? f.gallery.length : !!f[key])
              delete patch[key];
          }
        return { ...f, ...patch };
      });
      setMessages([
        result.sources.length
          ? `Fetched from ${result.sources.join(", ")}. Review the fields before saving.`
          : "No metadata found. Missing fields remain blank.",
        ...result.warnings,
      ]);
    } catch (e) {
      if (!signal?.aborted) setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setEnriching(false);
    }
  }
  useEffect(() => {
    if (form.title.trim().length < 2) {
      setEnriching(false);
      return;
    }
    if (form.steamAppId && !/^\d+$/.test(form.steamAppId)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void enrich(controller.signal, true);
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.title, form.steamAppId]);
  const textField = (
    key: keyof GameInput,
    label: string,
    placeholder = "",
    type = "text",
  ) => (
    <label>
      {label}
      <input
        type={type}
        value={String(form[key] ?? "")}
        placeholder={placeholder}
        onChange={(e) =>
          set(
            key,
            e.target.value ||
              (["releaseDate", "steamAppId"].includes(key) ? null : ""),
          )
        }
      />
    </label>
  );
  const numberField = (
    key: keyof GameInput,
    label: string,
    readOnly = false,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min="0"
        step="0.1"
        readOnly={readOnly}
        value={form[key] == null ? "" : Number(form[key])}
        onChange={(e) =>
          set(key, e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </label>
  );
  return (
    <Modal
      title={game ? "Edit your game" : "A new adventure awaits"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await save(form, game?.id);
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="form-intro">
          Make room for your next obsession. Add the details your way.
        </p>
        <div className="form-grid">
          {textField("title", "Game title *", "e.g. Hollow Knight")}
          {textField("steamAppId", "Steam App ID (optional)", "e.g. 367520")}
        </div>
        <Button
          type="button"
          disabled={!form.title || enriching}
          onClick={() => void enrich()}
        >
          <Sparkles className={enriching ? "spin" : ""} />
          {enriching ? "Finding your game…" : "Fetch metadata & artwork"}
        </Button>
        {messages.length > 0 && (
          <div className="provider-messages" role="status">
            {messages.map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </div>
        )}
        <div className="form-divider">THE BASICS</div>
        <div className="form-grid">
          <label>
            Status
            <select
              aria-label="Status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <PlatformInput
            value={form.platform}
            onChange={(value) => set("platform", value)}
            suggestions={games.flatMap((g) => splitPlatforms(g.platform))}
          />
          {textField("category", "Category", "Optional collection category")}
          {textField("releaseDate", "Release date", "", "date")}
          {numberField("timePlayedHours", "Your playtime (hours)")}
          <label>
            Rating
            <select
              value={form.rating ?? ""}
              onChange={(e) =>
                set("rating", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {"★".repeat(n)}
                </option>
              ))}
            </select>
          </label>
          {textField("inputMethod", "Input method")}
        </div>
        <label>
          Your review
          <textarea
            rows={3}
            value={form.reviewNotes || ""}
            onChange={(e) => set("reviewNotes", e.target.value)}
            placeholder="The moments worth remembering…"
          />
        </label>
        <label>
          Modded
          <select
            aria-label="Modded"
            value={
              form.isModded == null ? "unknown" : form.isModded ? "yes" : "no"
            }
            onChange={(e) =>
              set(
                "isModded",
                e.target.value === "unknown" ? null : e.target.value === "yes",
              )
            }
          >
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        {form.isModded && (
          <label>
            Mod notes
            <textarea
              value={form.modNotes || ""}
              onChange={(e) => set("modNotes", e.target.value)}
            />
          </label>
        )}
        <label>
          Additional notes
          <textarea
            rows={2}
            value={form.additionalNotes || ""}
            onChange={(e) => set("additionalNotes", e.target.value)}
          />
        </label>
        <details className="advanced">
          <summary>
            Completion estimates & media <ChevronDown size={16} />
          </summary>
          <div className="form-grid">
            {numberField("hltbMainStoryHours", "Main story (hours)", true)}
            {numberField("hltbMainExtraHours", "Main + extras (hours)", true)}
            {numberField(
              "hltbCompletionistHours",
              "Completionist (hours)",
              true,
            )}
            {textField("coverUrl", "Cover URL", "", "url")}
            {textField("heroUrl", "Hero URL", "", "url")}
            {textField("logoUrl", "Logo URL", "", "url")}
            {textField(
              "trailerUrl",
              "Trailer URL (video or YouTube)",
              "",
              "url",
            )}
          </div>
          <label>
            Screenshot URLs (one per line)
            <textarea
              rows={3}
              value={form.gallery.join("\n")}
              onChange={(e) => set("gallery", e.target.value.split("\n"))}
              onBlur={() =>
                set(
                  "gallery",
                  form.gallery.map((s) => s.trim()).filter(Boolean),
                )
              }
            />
          </label>
        </details>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button $primary disabled={busy || enriching} type="submit">
            {busy ? <LoaderCircle className="spin" /> : <Check />}
            {busy ? "Saving…" : game ? "Save changes" : "Add to library"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function App() {
  const l = useLibrary();
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const game = l.games.find((g) => g.id === l.selected);
  return (
    <div className="app">
      <Header onAdd={() => setModal("add")} />
      <div className="workspace">
        <Sidebar onAdd={() => setModal("add")} />
        <main>
          {l.loading ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              Opening your library…
            </div>
          ) : l.error ? (
            <div className="loading" role="alert">
              {l.error}
            </div>
          ) : game ? (
            <GameDetail game={game} onEdit={() => setModal("edit")} />
          ) : l.games.length ? (
            <CollectionGrid />
          ) : (
            <div className="welcome">
              <div className="welcome-grid" />
              <span className="eyebrow">
                <span className="online-dot" /> YOUR NEXT CHAPTER STARTS HERE
              </span>
              <div className="welcome-icon">
                <Gamepad2 size={54} />
              </div>
              <h1>
                So many worlds.
                <br />
                <span>One place for yours.</span>
              </h1>
              <p>
                The adventures you finished. The ones you return to.
                <br />
                And everything you can’t wait to play.
              </p>
              <Button $primary onClick={() => setModal("add")}>
                <Plus />
                Add your first game
                <ArrowRight />
              </Button>
              <div className="welcome-features">
                <span>
                  <Library size={18} /> Curate your collection
                </span>
                <span>
                  <Clock3 size={18} /> Track your journey
                </span>
                <span>
                  <Star size={18} /> Remember the good stuff
                </span>
              </div>
              <div className="welcome-bottom">
                YOUR LIBRARY, AT YOUR PACE.
                <span>Stored locally. Made personal.</span>
              </div>
            </div>
          )}
        </main>
      </div>
      {modal && (
        <EnrichmentModal
          game={modal === "edit" ? game : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
export default function Backlog() {
  return (
    <LibraryProvider>
      <App />
    </LibraryProvider>
  );
}
