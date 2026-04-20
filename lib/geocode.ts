const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeAddress(
  address: string,
  neighborhood?: string | null
): Promise<{ lat: number; lng: number } | null> {
  const query = [address, neighborhood, "Tel Aviv, Israel"]
    .filter(Boolean)
    .join(", ");

  if (cache.has(query)) return cache.get(query)!;

  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=il`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DirApp/1.0 apartment-rental-app" },
    });
    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
    }>;

    if (results.length === 0) {
      cache.set(query, null);
      return null;
    }

    const coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    cache.set(query, coords);
    return coords;
  } catch {
    return null;
  }
}

export const TEL_AVIV_NEIGHBORHOODS: Record<string, { lat: number; lng: number }> = {
  "Florentin": { lat: 32.0555, lng: 34.7676 },
  "Neve Tzedek": { lat: 32.0587, lng: 34.7657 },
  "Rothschild": { lat: 32.0632, lng: 34.7722 },
  "City Center": { lat: 32.0742, lng: 34.7748 },
  "Old North": { lat: 32.0882, lng: 34.7794 },
  "Old South": { lat: 32.0540, lng: 34.7710 },
  "Neve Sha'anan": { lat: 32.0499, lng: 34.7785 },
  "Shapira": { lat: 32.0520, lng: 34.7740 },
  "Ramat Aviv": { lat: 32.1132, lng: 34.8025 },
  "Tel Aviv Port": { lat: 32.0982, lng: 34.7704 },
  "Lev Tel Aviv": { lat: 32.0780, lng: 34.7800 },
  "Bavli": { lat: 32.1020, lng: 34.7900 },
  "Sarona": { lat: 32.0710, lng: 34.7880 },
  "Kerem HaTeimanim": { lat: 32.0658, lng: 34.7690 },
  "Jaffa": { lat: 32.0527, lng: 34.7507 },
};
