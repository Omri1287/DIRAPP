import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEL_AVIV_NEIGHBORHOODS } from "@/lib/geocode";

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
  const m = text.match(/(\d{3,6})\s*[₪]/) ?? text.match(/(\d{3,6})\s*ש["]?ח/) ?? text.match(/(\d{3,6})\s*שקל/);
  if (m) { const v = parseInt(m[1]); if (v >= 1000 && v <= 50000) return v; }
  return null;
}
function extractRooms(text: string): number | null {
  const m = text.match(/(\d(?:[.,]\d)?)\s*חד(?:רים|ר)?/) ?? text.match(/(\d(?:[.,]\d)?)\s*rooms?/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}
function extractSize(text: string): number | null {
  const m = text.match(/(\d{2,4})\s*מ(?:ר|"ר|טר)/);
  if (m) { const v = parseInt(m[1]); return v >= 20 && v <= 500 ? v : null; }
  return null;
}
function extractNeighborhood(text: string): string | null {
  for (const [he, en] of Object.entries(NEIGHBORHOODS_HE)) {
    if (text.includes(he)) return en;
  }
  for (const en of Object.keys(TEL_AVIV_NEIGHBORHOODS)) {
    if (text.toLowerCase().includes(en.toLowerCase())) return en;
  }
  return null;
}
function extractPhone(text: string): string | null {
  const m = text.match(/0[5-9]\d[-\s]?\d{3}[-\s]?\d{4}/);
  return m ? m[0].replace(/\s/g, "") : null;
}

export async function POST(req: NextRequest) {
  const { posts } = await req.json() as { posts: string[] };
  if (!Array.isArray(posts) || !posts.length) {
    return NextResponse.json({ error: "No posts provided" }, { status: 400 });
  }

  let saved = 0;
  for (const text of posts) {
    const price = extractPrice(text);
    if (!price) continue;

    const rooms = extractRooms(text);
    const size = extractSize(text);
    const neighborhood = extractNeighborhood(text);
    const phone = extractPhone(text);
    const coords = neighborhood ? TEL_AVIV_NEIGHBORHOODS[neighborhood] ?? null : null;

    const externalId = `manual-${Date.now()}-${saved}`;
    const title = [
      rooms ? `${rooms} חדרים` : null,
      neighborhood ? `ב${neighborhood}` : null,
      `₪${price.toLocaleString()}/חודש`,
    ].filter(Boolean).join(" ");

    await prisma.apartment.create({
      data: {
        externalId,
        title,
        description: text.slice(0, 2000),
        price,
        rooms,
        size,
        neighborhood,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        source: "facebook",
        contactPhone: phone,
        images: "[]",
      },
    });
    saved++;
  }

  return NextResponse.json({ success: true, count: saved });
}
