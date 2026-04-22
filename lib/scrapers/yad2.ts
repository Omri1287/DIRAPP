import { prisma } from "@/lib/db";
import { TEL_AVIV_NEIGHBORHOODS } from "@/lib/geocode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Yad2Item = Record<string, any>;

const NEIGHBORHOOD_MAP: Record<string, string> = {
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

function normalizeNeighborhood(raw?: string): string | null {
  if (!raw) return null;
  for (const [he, en] of Object.entries(NEIGHBORHOOD_MAP)) {
    if (raw.includes(he)) return en;
  }
  return raw;
}

function extractImages(item: Yad2Item): string {
  const imgs: string[] = [];
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      const url = typeof img === "string" ? img : img?.src || img?.url || img?.thumbnail;
      if (url && url.startsWith("http")) imgs.push(url);
    }
  }
  return JSON.stringify(imgs);
}

async function fetchPageWithBrowser(page: number): Promise<Yad2Item[]> {
  // Dynamic import so Playwright is only loaded when actually used
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      locale: "he-IL",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    // Visit the rent page first so anti-bot scripts run and cookies are set
    const pg = await ctx.newPage();
    await pg.goto("https://www.yad2.co.il/realestate/rent", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pg.waitForTimeout(3000);
    await pg.close();

    // Use ctx.request (Playwright's own HTTP client) — uses the browser session's
    // cookies but does NOT run through the page's JavaScript, so stormcaster.js
    // cannot intercept or block the fetch.
    const apiUrl =
      `https://gw.yad2.co.il/feed-search-legacy/realestate/rent` +
      `?city=5000&propertyGroup=apartments&page=${page}&forceLdLoad=true`;

    const res = await ctx.request.get(apiUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "he-IL,he;q=0.9",
        Referer: "https://www.yad2.co.il/realestate/rent",
      },
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Yad2 non-JSON response: ${text.slice(0, 300)}`);
    }
    return (data?.data as Record<string, unknown>)?.feed
      ? ((data.data as Record<string, unknown>).feed as Record<string, unknown>)?.feed_items as Yad2Item[] ?? []
      : (data?.feed as Record<string, unknown>)?.feed_items as Yad2Item[] ?? data?.feed_items as Yad2Item[] ?? [];
  } finally {
    await browser.close();
  }
}

export async function scrapeYad2(maxItems = 100): Promise<number> {
  let upserted = 0;
  let page = 1;

  while (upserted < maxItems) {
    const items = await fetchPageWithBrowser(page);
    if (!items.length) break;

    for (const item of items) {
      if (!item || item.type === "ad") continue;

      const price = item.price;
      if (!price || isNaN(Number(price))) continue;

      const externalId = `yad2-${item.id ?? item.orderId}`;
      if (!externalId || externalId === "yad2-undefined") continue;

      const neighborhood = normalizeNeighborhood(item.neighborhood ?? item.hood);
      const street = item.street ?? "";
      const houseNum = item.house_number ?? item.houseNum ?? "";
      const address = [street, houseNum].filter(Boolean).join(" ").trim() || null;

      let lat: number | null = item.coordinates?.latitude ?? null;
      let lng: number | null = item.coordinates?.longitude ?? null;
      if (!lat && neighborhood && TEL_AVIV_NEIGHBORHOODS[neighborhood]) {
        lat = TEL_AVIV_NEIGHBORHOODS[neighborhood].lat;
        lng = TEL_AVIV_NEIGHBORHOODS[neighborhood].lng;
      }

      const title =
        item.title_1 ??
        item.row_1 ??
        `${item.rooms ?? "?"} חדרים ב${neighborhood ?? "תל אביב"}`;

      await prisma.apartment.upsert({
        where: { externalId },
        create: {
          externalId,
          title,
          description: item.info_text ?? item.description ?? null,
          price: Number(price),
          rooms: item.rooms != null ? Number(item.rooms) : null,
          size: item.square_meters ?? item.squareMeter ?? null,
          floor: item.floor != null ? Number(item.floor) : null,
          totalFloors: item.total_floors ?? null,
          neighborhood,
          address,
          lat,
          lng,
          furnished: item.furniture != null ? Boolean(item.furniture) : null,
          parking: item.parking != null ? Boolean(item.parking) : null,
          elevator: item.elevator != null ? Boolean(item.elevator) : null,
          balcony: item.balcony != null ? Boolean(item.balcony) : null,
          images: extractImages(item),
          source: "yad2",
          sourceUrl: item.id ? `https://www.yad2.co.il/item/${item.id}` : null,
          contactName: item.contact_name ?? null,
          postedAt: item.date ? new Date(item.date) : null,
        },
        update: {
          price: Number(price),
          title,
          images: extractImages(item),
        },
      });

      upserted++;
      if (upserted >= maxItems) break;
    }

    page++;
    await new Promise((r) => setTimeout(r, 1000));
  }

  return upserted;
}
