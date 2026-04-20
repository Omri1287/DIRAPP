"use client";

import { useCallback } from "react";

export interface Filters {
  neighborhoods: string[];
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  minSize: string;
  maxSize: string;
  minFloor: string;
  maxFloor: string;
  furnished: string;
  parking: string;
  elevator: string;
  balcony: string;
  petsAllowed: string;
  source: string;
  sort: string;
}

export const DEFAULT_FILTERS: Filters = {
  neighborhoods: [],
  minPrice: "",
  maxPrice: "",
  minRooms: "",
  maxRooms: "",
  minSize: "",
  maxSize: "",
  minFloor: "",
  maxFloor: "",
  furnished: "",
  parking: "",
  elevator: "",
  balcony: "",
  petsAllowed: "",
  source: "all",
  sort: "newest",
};

const NEIGHBORHOODS = [
  "Florentin",
  "Neve Tzedek",
  "Rothschild",
  "City Center",
  "Old North",
  "Old South",
  "Neve Sha'anan",
  "Shapira",
  "Ramat Aviv",
  "Tel Aviv Port",
  "Lev Tel Aviv",
  "Bavli",
  "Sarona",
  "Kerem HaTeimanim",
  "Jaffa",
];

const ROOMS = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function FiltersSidebar({ filters, onChange }: Props) {
  const set = useCallback(
    (key: keyof Filters, value: string) =>
      onChange({ ...filters, [key]: value }),
    [filters, onChange]
  );

  const toggleNeighborhood = useCallback(
    (n: string) => {
      const next = filters.neighborhoods.includes(n)
        ? filters.neighborhoods.filter((x) => x !== n)
        : [...filters.neighborhoods, n];
      onChange({ ...filters, neighborhoods: next });
    },
    [filters, onChange]
  );

  return (
    <aside className="flex flex-col gap-6 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-base">Filters</h2>
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs text-emerald-600 hover:underline"
        >
          Reset all
        </button>
      </div>

      {/* Sort */}
      <Section title="Sort by">
        <select
          value={filters.sort}
          onChange={(e) => set("sort", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="rooms_asc">Rooms: low → high</option>
          <option value="rooms_desc">Rooms: high → low</option>
        </select>
      </Section>

      {/* Source */}
      <Section title="Source">
        <div className="flex gap-2">
          {(["all", "yad2", "facebook"] as const).map((s) => (
            <button
              key={s}
              onClick={() => set("source", s)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize transition ${
                filters.source === s
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {s === "all" ? "All" : s === "yad2" ? "Yad2" : "Facebook"}
            </button>
          ))}
        </div>
      </Section>

      {/* Neighborhood */}
      <Section title="Neighborhood">
        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
          {NEIGHBORHOODS.map((n) => (
            <label key={n} className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
              <input
                type="checkbox"
                checked={filters.neighborhoods.includes(n)}
                onChange={() => toggleNeighborhood(n)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700">{n}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Price */}
      <Section title="Price (₪/month)">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => set("minPrice", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => set("maxPrice", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </Section>

      {/* Rooms */}
      <Section title="Rooms">
        <div className="grid grid-cols-3 gap-1.5">
          {ROOMS.map((r) => {
            const active =
              filters.minRooms === r && filters.maxRooms === r;
            return (
              <button
                key={r}
                onClick={() => {
                  if (active) {
                    onChange({ ...filters, minRooms: "", maxRooms: "" });
                  } else {
                    onChange({ ...filters, minRooms: r, maxRooms: r });
                  }
                }}
                className={`rounded-lg border py-1.5 text-xs transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {r}
              </button>
            );
          })}
          <button
            onClick={() => onChange({ ...filters, minRooms: "5", maxRooms: "" })}
            className={`col-span-3 rounded-lg border py-1.5 text-xs transition ${
              filters.minRooms === "5" && !filters.maxRooms
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            5+
          </button>
        </div>
      </Section>

      {/* Size */}
      <Section title="Size (m²)">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minSize}
            onChange={(e) => set("minSize", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxSize}
            onChange={(e) => set("maxSize", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </Section>

      {/* Floor */}
      <Section title="Floor">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minFloor}
            onChange={(e) => set("minFloor", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxFloor}
            onChange={(e) => set("maxFloor", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </Section>

      {/* Amenities */}
      <Section title="Amenities">
        {(
          [
            { key: "furnished", label: "Furnished" },
            { key: "parking", label: "Parking" },
            { key: "elevator", label: "Elevator" },
            { key: "balcony", label: "Balcony" },
            { key: "petsAllowed", label: "Pets allowed" },
          ] as { key: keyof Filters; label: string }[]
        ).map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-gray-900">
            <input
              type="checkbox"
              checked={filters[key] === "true"}
              onChange={(e) => set(key, e.target.checked ? "true" : "")}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-gray-700">{label}</span>
          </label>
        ))}
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </div>
  );
}
