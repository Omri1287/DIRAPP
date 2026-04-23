import { prisma } from "@/lib/db";
import { TEL_AVIV_NEIGHBORHOODS } from "@/lib/geocode";
import { apifyProxy } from "@/lib/proxy";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

// Recursively search a JSON tree for arrays that look like listing objects.
// We stop when we find an array whose first element has a price-like field.
function findListingArrays(node: unknown, depth = 0): AnyObj[] {
  if (depth > 8 || node === null || typeof node !== "object") return [];
  if (Array.isArray(node)) {
    if (node.length === 0) return [];
    const sample = node[0] as AnyObj;
    const looksLikeListing =
      sample.price != null ||
      sample.rentPrice != null ||
      sample.rent != null ||
      sample.id != null ||
      sample.listingId != null ||
      sample.bulletinId != null;
    if (looksLikeListing) return node as AnyObj[];
    return node.flatMap((child) => findListingArrays(child, depth + 1));
  }
  return Object.values(node as AnyObj).flatMap((v) => findListingArrays(v, depth + 1));
}

const NEIGHBORHOOD_HE: Record<string, string> = {
  "פלורנטין": "Florentin",
  "נווה צדק": "Neve Tzedek",
  "רוטשילד": "Rothschild",
  "מרכז העיר": "City Center",
  "צפון ישן": "Old North",
  "דרום ישן": "Old South",
  "נווה שאנן": "Neve Sha'anan",
  "שפירא": "Shapira",
  "רמת אביב": "Ramat Aviv",
  "נמל תל אביב": "Tel Aviv Port",
  "לב תל אביב": "Lev Tel Aviv",
  "בבלי": "Bavli",
  "שרונה": "Sarona",
  "כרם התימנים": "Kerem HaTeimanim",
  "יפו": "Jaffa",
};

function resolveNeighborhood(raw?: string | null): string | null {
  if (!raw) return null;
  for (const [he, en] of Object.entries(NEIGHBORHOOD_HE)) {
    if (raw.includes(he)) return en;
  }
  for (const en of Object.keys(TEL_AVIV_NEIGHBORHOODS)) {
    if (raw.toLowerCase().includes(en.toLowerCase())) return en;
  }
  return raw;
}

function extractImages(item: AnyObj): string {
  const imgs: string[] = [];
  const raw = item.images ?? item.photos ?? item.media ?? item.gallery;
  if (Array.isArray(raw)) {
    for (const img of raw) {
      const url = typeof img === "string" ? img : img?.src ?? img?.url ?? img?.uri ?? img?.thumbnail;
      if (typeof url === "string" && url.startsWith("http")) imgs.push(url);
    }
  }
  return JSON.stringify(imgs);
}

function normalizeItem(item: AnyObj): {
  externalId: string;
  title: string;
  price: number;
  rooms: number | null;
  size: number | null;
  floor: number | null;
  neighborhood: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  images: string;
  sourceUrl: string | null;
  description: string | null;
} | null {
  const rawPrice =
    item.price ?? item.rentPrice ?? item.rent ?? item.monthlyPrice ?? item.monthlyRent;
  const price = rawPrice != null ? Number(rawPrice) : null;
  if (!price || isNaN(price) || price < 1000 || price > 100000) return null;

  const rawId =
    item.id ?? item.listingId ?? item.bulletinId ?? item._id ?? item.token ?? item.key;
  if (rawId == null) return null;
  const externalId = `madlan-${rawId}`;

  const rooms =
    item.rooms != null ? Number(item.rooms) :
    item.roomCount != null ? Number(item.roomCount) :
    item.roomNum != null ? Number(item.roomNum) : null;

  const rawSize =
    item.squareMeters ?? item.area ?? item.size ?? item.sqm ?? item.floorArea;
  const size = rawSize != null ? Number(rawSize) : null;

  const floor = item.floor != null ? Number(item.floor) : null;

  const nhRaw =
    item.neighborhood ?? item.neighborhoodName ?? item.hood ?? item.area_name ?? item.zone;
  const neighborhood = resolveNeighborhood(typeof nhRaw === "string" ? nhRaw : null);

  const street = item.street ?? item.streetName ?? item.streetAddress ?? "";
  const houseNum = item.houseNum ?? item.houseNumber ?? item.streetNumber ?? "";
  const address = [street, houseNum].filter(Boolean).join(" ").trim() || null;

  const lat: number | null =
    item.lat ?? item.latitude ?? item.coordinates?.lat ?? item.location?.lat ?? null;
  const lng: number | null =
    item.lng ?? item.longitude ?? item.coordinates?.lng ?? item.location?.lng ?? null;

  const images = extractImages(item);

  const title =
    item.title ??
    [
      rooms ? `${rooms} חדרים` : null,
      neighborhood ? `ב${neighborhood}` : "בתל אביב",
      `- ₪${price.toLocaleString()}`,
    ]
      .filter(Boolean)
      .join(" ");

  const sourceUrl =
    item.url ?? item.listingUrl ?? item.canonicalUrl ??
    `https://www.madlan.co.il/listing/${rawId}`;

  const description =
    item.description ?? item.details ?? item.text ?? item.content ?? null;

  return { externalId, title, price, rooms, size, floor, neighborhood, address, lat, lng, images, sourceUrl, description };
}

export async function scrapeMadlan(
  maxItems = 100,
  log: (msg: string) => void = () => {},
): Promise<number> {
  const { chromium } = await import("playwright");
  const proxy = apifyProxy();
  const browser = await chromium.launch({ headless: true, ...(proxy ? { proxy } : {}) });
  let saved = 0;

  try {
    const ctx = await browser.newContext({
      locale: "he-IL",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const pg = await ctx.newPage();
    const capturedRaw: AnyObj[] = [];

    // Intercept all JSON responses from madlan.co.il
    await pg.route("**madlan.co.il**", async (route) => {
      const response = await route.fetch();
      const ct = (response.headers()["content-type"] ?? "").toLowerCase();
      if (ct.includes("json")) {
        try {
          const text = await response.text();
          const data = JSON.parse(text);
          const listings = findListingArrays(data);
          if (listings.length) capturedRaw.push(...listings);
        } catch { /* non-parseable */ }
      }
      await route.fulfill({ response });
    });

    log("Navigating to Madlan Tel Aviv rentals…");
    await pg.goto("https://www.madlan.co.il/for-rent/tel-aviv-yafo", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // Fallback: extract __NEXT_DATA__ embedded in the page
    if (capturedRaw.length === 0) {
      log("No API JSON captured — trying __NEXT_DATA__…");
      const nextDataStr = await pg.evaluate(
        () => document.getElementById("__NEXT_DATA__")?.textContent ?? null,
      );
      if (nextDataStr) {
        const listings = findListingArrays(JSON.parse(nextDataStr));
        capturedRaw.push(...listings);
      }
    }

    log(`${capturedRaw.length} raw objects captured`);

    // Deduplicate
    const seen = new Set<string>();
    for (const item of capturedRaw) {
      if (saved >= maxItems) break;
      const normalized = normalizeItem(item);
      if (!normalized) continue;
      if (seen.has(normalized.externalId)) continue;
      seen.add(normalized.externalId);

      const coords =
        normalized.lat != null
          ? { lat: normalized.lat, lng: normalized.lng }
          : normalized.neighborhood
          ? TEL_AVIV_NEIGHBORHOODS[normalized.neighborhood] ?? null
          : null;

      await prisma.apartment.upsert({
        where: { externalId: normalized.externalId },
        create: {
          externalId: normalized.externalId,
          title: normalized.title,
          description: normalized.description,
          price: normalized.price,
          rooms: normalized.rooms,
          size: normalized.size,
          floor: normalized.floor,
          neighborhood: normalized.neighborhood,
          address: normalized.address,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          source: "madlan",
          sourceUrl: normalized.sourceUrl,
          images: normalized.images,
        },
        update: { price: normalized.price, title: normalized.title, images: normalized.images },
      });
      saved++;
    }

    log(`${saved} listings saved`);
  } finally {
    await browser.close();
  }

  return saved;
}
