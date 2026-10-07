"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { platformOptions, splitPlatforms } from "@/lib/platforms";

export default function PlatformInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = splitPlatforms(value);
  const all = splitPlatforms(
    [...platformOptions, ...suggestions, ...selected].join(","),
  );
  const options = all
    .filter((p) => p.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const custom =
    query.trim() &&
    !all.some((p) => p.toLowerCase() === query.trim().toLowerCase());
  const visible = custom ? [...options, query.trim()] : options;
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  function add(text: string) {
    onChange(splitPlatforms([...selected, text].join(",")).join(", "));
    setQuery("");
    setActive(0);
  }
  function toggle(platform: string) {
    if (selected.includes(platform))
      onChange(selected.filter((p) => p !== platform).join(", "));
    else add(platform);
    input.current?.focus();
  }
  return (
    <div
      className="platform-field"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          if (query.trim()) add(query);
          setOpen(false);
        }
      }}
    >
      <label htmlFor={id}>Platforms *</label>
      <div className="platform-input" onClick={() => input.current?.focus()}>
        {selected.map((platform) => (
          <span className="platform-chip" key={platform}>
            {platform}
            <button
              type="button"
              aria-label={`Remove ${platform}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(platform);
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && visible[active] ? `${id}-option-${active}` : undefined
          }
          autoComplete="off"
          placeholder="Search or type a platform…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const text = e.target.value;
            if (text.includes(",")) {
              const parts = text.split(",");
              const pending = parts.pop() || "";
              add(parts.join(","));
              setQuery(pending);
            } else setQuery(text);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((n) =>
                Math.max(
                  0,
                  Math.min(
                    visible.length - 1,
                    n + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (query.trim()) add(visible[active] || query);
              else if (open && visible[active]) toggle(visible[active]);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
            if (e.key === "Backspace" && !query && selected.length)
              onChange(selected.slice(0, -1).join(", "));
          }}
        />
      </div>
      <small className="field-hint">
        Use commas or Enter to add platforms.
      </small>
      {open && (
        <div
          className="platform-options"
          id={`${id}-list`}
          role="listbox"
          aria-label="Available platforms"
          aria-multiselectable="true"
        >
          {visible.map((platform, i) => (
            <button
              type="button"
              key={platform}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={selected.includes(platform)}
              className={active === i ? "active-option" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => toggle(platform)}
            >
              <span>
                {custom && platform === query.trim()
                  ? `Add “${platform}”`
                  : platform}
              </span>
              {selected.includes(platform) && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
