"use client";

import { useState, useEffect, useCallback } from "react";
import { FiltersSidebar, Filters, DEFAULT_FILTERS } from "@/components/FiltersSidebar";
import { ApartmentGrid } from "@/components/ApartmentGrid";
import { MapView } from "@/components/MapView";

interface Apartment {
  id: string;
  title: string;
  price: number;
  rooms: number | null;
  size: number | null;
  floor: number | null;
  neighborhood: string | null;
  address: string | null;
  images: string;
  source: string;
  furnished: boolean | null;
  parking: boolean | null;
  elevator: boolean | null;
  balcony: boolean | null;
  lat: number | null;
  lng: number | null;
}

interface ApiResponse {
  apartments: Apartment[];
  total: number;
  page: number;
  pages: number;
}

type ViewMode = "grid" | "map" | "split";

export default function HomePage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse>({ apartments: [], total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchApartments = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (f.sort) params.set("sort", f.sort);
    if (f.source) params.set("source", f.source);
    f.neighborhoods.forEach((n) => params.append("neighborhood", n));
    if (f.minPrice) params.set("minPrice", f.minPrice);
    if (f.maxPrice) params.set("maxPrice", f.maxPrice);
    if (f.minRooms) params.set("minRooms", f.minRooms);
    if (f.maxRooms) params.set("maxRooms", f.maxRooms);
    if (f.minSize) params.set("minSize", f.minSize);
    if (f.maxSize) params.set("maxSize", f.maxSize);
    if (f.minFloor) params.set("minFloor", f.minFloor);
    if (f.maxFloor) params.set("maxFloor", f.maxFloor);
    if (f.furnished) params.set("furnished", f.furnished);
    if (f.parking) params.set("parking", f.parking);
    if (f.elevator) params.set("elevator", f.elevator);
    if (f.balcony) params.set("balcony", f.balcony);
    if (f.petsAllowed) params.set("petsAllowed", f.petsAllowed);

    try {
      const res = await fetch(`/api/apartments?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApartments(filters, page);
  }, [filters, page, fetchApartments]);

  const handleFilterChange = (f: Filters) => {
    setFilters(f);
    setPage(1);
  };

  const mapApartments = data.apartments
    .filter((a) => a.lat && a.lng)
    .map((a) => ({
      id: a.id,
      title: a.title,
      price: a.price,
      rooms: a.rooms,
      neighborhood: a.neighborhood,
      lat: a.lat!,
      lng: a.lng!,
    }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tel Aviv Rentals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Apartments for rent from Yad2 &amp; Facebook groups</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            Filters
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["grid", "split", "map"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                title={v.charAt(0).toUpperCase() + v.slice(1)}
                className={`px-3 py-2 text-xs transition ${
                  view === v ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {v === "grid" ? <GridIcon /> : v === "map" ? <MapIcon /> : <SplitIcon />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? "block" : "hidden"} lg:block w-64 shrink-0`}>
          <div className="sticky top-20 bg-white rounded-2xl border border-gray-200 p-5 max-h-[calc(100vh-96px)] overflow-y-auto">
            <FiltersSidebar filters={filters} onChange={handleFilterChange} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {view === "grid" && (
            <ApartmentGrid
              apartments={data.apartments}
              total={data.total}
              page={page}
              pages={data.pages}
              onPageChange={setPage}
              loading={loading}
            />
          )}

          {view === "map" && (
            <div style={{ height: "calc(100vh - 140px)" }}>
              <MapView apartments={mapApartments} />
            </div>
          )}

          {view === "split" && (
            <div className="flex gap-4" style={{ height: "calc(100vh - 140px)" }}>
              <div className="flex-1 overflow-y-auto pr-2">
                <ApartmentGrid
                  apartments={data.apartments}
                  total={data.total}
                  page={page}
                  pages={data.pages}
                  onPageChange={setPage}
                  loading={loading}
                />
              </div>
              <div className="w-96 shrink-0 hidden xl:block">
                <MapView apartments={mapApartments} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}
