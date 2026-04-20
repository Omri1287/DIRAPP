"use client";

import { useEffect, useRef } from "react";

interface ApartmentPin {
  id: string;
  title: string;
  price: number;
  rooms: number | null;
  neighborhood: string | null;
  lat: number;
  lng: number;
}

interface Props {
  apartments: ApartmentPin[];
}

export function MapView({ apartments }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  const pinned = apartments.filter((a) => a.lat && a.lng);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Fix default marker icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [32.0853, 34.7818],
        zoom: 13,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      for (const apt of pinned) {
        const popup = `
          <div style="min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${apt.title}</div>
            <div style="color:#059669;font-size:1rem;font-weight:700">₪${apt.price.toLocaleString()}/mo</div>
            ${apt.rooms ? `<div style="color:#6b7280;font-size:0.75rem">${apt.rooms} rooms</div>` : ""}
            ${apt.neighborhood ? `<div style="color:#6b7280;font-size:0.75rem">${apt.neighborhood}</div>` : ""}
            <a href="/apartments/${apt.id}" style="display:inline-block;margin-top:6px;color:#059669;font-size:0.75rem">View details →</a>
          </div>
        `;
        L.marker([apt.lat, apt.lng]).addTo(map).bindPopup(popup);
      }

      mapInstanceRef.current = map;
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned.length]);

  if (!pinned.length) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 rounded-2xl text-gray-400 text-sm">
        No listings with location data to show on the map.
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-full w-full rounded-2xl overflow-hidden border border-gray-200"
      style={{ minHeight: "400px" }}
    />
  );
}
