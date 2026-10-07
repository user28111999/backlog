"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Game, GameInput } from "@/lib/game";
type Library = {
  games: Game[];
  selected: string | null;
  select: (id: string | null) => void;
  refresh: () => Promise<void>;
  search: string;
  setSearch: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  platform: string;
  setPlatform: (s: string) => void;
  sort: string;
  setSort: (s: string) => void;
  loading: boolean;
  error: string;
  save: (data: GameInput | Partial<GameInput>, id?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};
const Context = createContext<Library | null>(null);
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]),
    [selected, select] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [platform, setPlatform] = useState("ALL"),
    [sort, setSort] = useState("title-asc"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const r = await fetch("/api/games");
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    setGames(result);
    select((current) =>
      result.some((g: Game) => g.id === current) ? current : null,
    );
  }, []);
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refresh]);
  async function save(data: GameInput | Partial<GameInput>, id?: string) {
    const r = await fetch(id ? `/api/games/${id}` : "/api/games", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    await refresh();
    select(result.id);
  }
  async function remove(id: string) {
    const r = await fetch(`/api/games/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error((await r.json()).error);
    await refresh();
  }
  return (
    <Context.Provider
      value={{
        games,
        selected,
        select,
        refresh,
        search,
        setSearch,
        status,
        setStatus,
        platform,
        setPlatform,
        sort,
        setSort,
        loading,
        error,
        save,
        remove,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLibrary() {
  const value = useContext(Context);
  if (!value) throw new Error("Library provider missing");
  return value;
}
