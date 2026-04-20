import { prisma } from "@/lib/db";
import { runActor } from "@/lib/apify";
import { geocodeAddress, TEL_AVIV_NEIGHBORHOODS } from "@/lib/geocode";

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
      const url = typeof img === "string" ? img : img?.src || img?.url;
      if (url) imgs.push(url);
    }
  } else if (item.imageUrl) {
    imgs.push(item.imageUrl);
  }
  return JSON.stringify(imgs);
}

export async function scrapeYad2(): Promise<number> {
  const items = (await runActor("swerve/yad2-scraper", {
    locationQuery: "תל אביב - יפו",
    propertyType: "apartments",
    dealType: "rent",
    maxItems: 200,
  })) as Yad2Item[];

  let upserted = 0;

  for (const item of items) {
    if (!item) continue;

    const price =
      item.price ?? item.pricePerMonth ?? item.rent;
    if (!price || isNaN(Number(price))) continue;

    const externalId = `yad2-${item.id ?? item.listingId ?? item.token}`;
    const neighborhood = normalizeNeighborhood(
      item.neighborhood ?? item.area ?? item.cityAreaName
    );
    const address =
      item.address ?? item.street
        ? `${item.street ?? ""} ${item.houseNum ?? ""}`.trim()
        : null;

    let lat = item.latitude ?? item.lat ?? null;
    let lng = item.longitude ?? item.lng ?? null;

    if (!lat && address) {
      const coords = await geocodeAddress(address, neighborhood);
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }

    if (!lat && neighborhood && TEL_AVIV_NEIGHBORHOODS[neighborhood]) {
      lat = TEL_AVIV_NEIGHBORHOODS[neighborhood].lat;
      lng = TEL_AVIV_NEIGHBORHOODS[neighborhood].lng;
    }

    await prisma.apartment.upsert({
      where: { externalId },
      create: {
        externalId,
        title:
          item.title ??
          item.adTitle ??
          `${item.rooms ?? "?"} rooms in ${neighborhood ?? "Tel Aviv"}`,
        description: item.description ?? item.additionalDetails ?? null,
        price: Number(price),
        rooms: item.rooms != null ? Number(item.rooms) : null,
        size: item.squareMeter ?? item.size ?? null,
        floor: item.floor != null ? Number(item.floor) : null,
        totalFloors: item.totalFloors ?? null,
        neighborhood,
        address,
        lat,
        lng,
        furnished: item.furniture === true || item.furniture === "כן" || null,
        parking: item.parking === true || item.parking === "כן" || null,
        elevator: item.elevator === true || item.elevator === "כן" || null,
        balcony: item.balcony === true || item.balcony === "כן" || null,
        petsAllowed: item.pets === true || item.pets === "כן" || null,
        images: extractImages(item),
        source: "yad2",
        sourceUrl: item.url ?? item.link ?? null,
        contactPhone: item.contactPhone ?? item.phone ?? null,
        contactName: item.contactName ?? item.name ?? null,
        postedAt: item.date ? new Date(item.date) : null,
      },
      update: {
        price: Number(price),
        description: item.description ?? item.additionalDetails ?? null,
        images: extractImages(item),
        postedAt: item.date ? new Date(item.date) : null,
      },
    });

    upserted++;
  }

  return upserted;
}
