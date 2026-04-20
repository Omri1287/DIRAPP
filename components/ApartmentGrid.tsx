"use client";

import { ApartmentCard } from "./ApartmentCard";

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
}

interface Props {
  apartments: Apartment[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (p: number) => void;
  loading?: boolean;
}

export function ApartmentGrid({ apartments, total, page, pages, onPageChange, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-gray-50 h-72 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!apartments.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-medium">No apartments found</p>
        <p className="text-sm">Try adjusting your filters or scrape new listings from the admin panel.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500">{total.toLocaleString()} listings found</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {apartments.map((apt) => (
          <ApartmentCard key={apt.id} apt={apt} />
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
