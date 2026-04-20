"use client";

import Link from "next/link";
import { SourceBadge } from "./SourceBadge";

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

export function ApartmentCard({ apt }: { apt: Apartment }) {
  const images: string[] = JSON.parse(apt.images || "[]");
  const thumb = images[0];

  const amenities: string[] = [
    apt.furnished ? "Furnished" : null,
    apt.parking ? "Parking" : null,
    apt.elevator ? "Elevator" : null,
    apt.balcony ? "Balcony" : null,
  ].filter((x): x is string => x !== null);

  return (
    <Link
      href={`/apartments/${apt.id}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md overflow-hidden"
    >
      <div className="relative h-48 bg-gray-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={apt.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 22V12h6v10" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <SourceBadge source={apt.source} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">{apt.title}</h3>
          <span className="shrink-0 text-lg font-bold text-emerald-600">
            ₪{apt.price.toLocaleString()}
          </span>
        </div>

        {apt.neighborhood && (
          <p className="text-xs text-gray-500">{apt.neighborhood}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {apt.rooms != null && (
            <span className="flex items-center gap-1">
              <RoomsIcon />
              {apt.rooms} rooms
            </span>
          )}
          {apt.size != null && (
            <span className="flex items-center gap-1">
              <SizeIcon />
              {apt.size} m²
            </span>
          )}
          {apt.floor != null && (
            <span className="flex items-center gap-1">
              <FloorIcon />
              Floor {apt.floor}
            </span>
          )}
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {amenities.map((a) => (
              <span key={a} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function RoomsIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function SizeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function FloorIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2z" />
    </svg>
  );
}
