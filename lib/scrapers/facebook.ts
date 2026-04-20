import { prisma } from "@/lib/db";
import { runActor } from "@/lib/apify";
import { TEL_AVIV_NEIGHBORHOODS } from "@/lib/geocode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FbPost = Record<string, any>;

const NEIGHBORHOODS_EN = Object.keys(TEL_AVIV_NEIGHBORHOODS);
const NEIGHBORHOODS_HE: Record<string, string> = {
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

function extractPrice(text: string): number | null {
  const patterns = [
    /(\d{3,6})\s*[₪]/,
    /(\d{3,6})\s*שח/,
    /(\d{3,6})\s*ש"ח/,
    /שכירות[^0-9]*(\d{3,6})/i,
    /מחיר[^0-9]*(\d{3,6})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val >= 1000 && val <= 50000) return val;
    }
  }
  return null;
}

function extractRooms(text: string): number | null {
  const m =
    text.match(/(\d(?:[.,]\d)?)\s*חד(?:רים|ר)?/) ??
    text.match(/(\d(?:[.,]\d)?)\s*rooms?/i);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function extractSize(text: string): number | null {
  const m =
    text.match(/(\d{2,4})\s*מ(?:ר|"ר|טר)/) ??
    text.match(/(\d{2,4})\s*sqm/i) ??
    text.match(/(\d{2,4})\s*m²/i);
  if (!m) return null;
  const val = parseInt(m[1], 10);
  return val >= 20 && val <= 500 ? val : null;
}

function extractNeighborhood(text: string): string | null {
  for (const [he, en] of Object.entries(NEIGHBORHOODS_HE)) {
    if (text.includes(he)) return en;
  }
  for (const en of NEIGHBORHOODS_EN) {
    if (text.toLowerCase().includes(en.toLowerCase())) return en;
  }
  return null;
}

function extractPhone(text: string): string | null {
  const m = text.match(/0[5-9]\d[-\s]?\d{3}[-\s]?\d{4}/);
  return m ? m[0].replace(/\s/g, "") : null;
}

function buildTitle(
  rooms: number | null,
  neighborhood: string | null,
  price: number | null
): string {
  const parts: string[] = [];
  if (rooms) parts.push(`${rooms} room${rooms !== 1 ? "s" : ""}`);
  if (neighborhood) parts.push(`in ${neighborhood}`);
  if (price) parts.push(`- ₪${price.toLocaleString()}/mo`);
  return parts.length ? parts.join(" ") : "Apartment for rent in Tel Aviv";
}

export async function scrapeFacebook(groupUrls: string[]): Promise<number> {
  if (!groupUrls.length) return 0;

  const posts = (await runActor("apify/facebook-groups-scraper", {
    startUrls: groupUrls.map((url) => ({ url })),
    maxPosts: 100,
    maxPostComments: 0,
  })) as FbPost[];

  let saved = 0;

  for (const post of posts) {
    const text: string = post.text ?? post.message ?? "";
    if (!text || text.length < 20) continue;

    const price = extractPrice(text);
    if (!price) continue;

    const externalId = `fb-${post.postId ?? post.id ?? post.url}`;
    const rooms = extractRooms(text);
    const size = extractSize(text);
    const neighborhood = extractNeighborhood(text);
    const phone = extractPhone(text);

    const coords =
      neighborhood && TEL_AVIV_NEIGHBORHOODS[neighborhood]
        ? TEL_AVIV_NEIGHBORHOODS[neighborhood]
        : null;

    await prisma.apartment.upsert({
      where: { externalId },
      create: {
        externalId,
        title: buildTitle(rooms, neighborhood, price),
        description: text.slice(0, 2000),
        price,
        rooms,
        size,
        neighborhood,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        images: JSON.stringify(post.images ?? []),
        source: "facebook",
        sourceUrl: post.url ?? post.postUrl ?? null,
        contactPhone: phone,
        contactName: post.user?.name ?? post.authorName ?? null,
        postedAt: post.time ? new Date(post.time) : null,
      },
      update: {
        price,
        description: text.slice(0, 2000),
      },
    });

    saved++;
  }

  return saved;
}
