import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 24;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const where: Prisma.ApartmentWhereInput = { city: { contains: "Tel Aviv" } };

  const neighborhoods = p.getAll("neighborhood");
  if (neighborhoods.length) where.neighborhood = { in: neighborhoods };

  const minPrice = p.get("minPrice");
  const maxPrice = p.get("maxPrice");
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseInt(minPrice);
    if (maxPrice) where.price.lte = parseInt(maxPrice);
  }

  const minRooms = p.get("minRooms");
  const maxRooms = p.get("maxRooms");
  if (minRooms || maxRooms) {
    where.rooms = {};
    if (minRooms) (where.rooms as Prisma.FloatNullableFilter).gte = parseFloat(minRooms);
    if (maxRooms) (where.rooms as Prisma.FloatNullableFilter).lte = parseFloat(maxRooms);
  }

  const minSize = p.get("minSize");
  const maxSize = p.get("maxSize");
  if (minSize || maxSize) {
    where.size = {};
    if (minSize) (where.size as Prisma.FloatNullableFilter).gte = parseFloat(minSize);
    if (maxSize) (where.size as Prisma.FloatNullableFilter).lte = parseFloat(maxSize);
  }

  const minFloor = p.get("minFloor");
  const maxFloor = p.get("maxFloor");
  if (minFloor || maxFloor) {
    where.floor = {};
    if (minFloor) (where.floor as Prisma.IntNullableFilter).gte = parseInt(minFloor);
    if (maxFloor) (where.floor as Prisma.IntNullableFilter).lte = parseInt(maxFloor);
  }

  const boolFilter = (key: string, field: keyof Prisma.ApartmentWhereInput) => {
    const val = p.get(key);
    if (val === "true") (where as Record<string, unknown>)[field as string] = true;
    if (val === "false") (where as Record<string, unknown>)[field as string] = false;
  };
  boolFilter("furnished", "furnished");
  boolFilter("parking", "parking");
  boolFilter("elevator", "elevator");
  boolFilter("balcony", "balcony");
  boolFilter("petsAllowed", "petsAllowed");

  const source = p.get("source");
  if (source && source !== "all") where.source = source;

  const sortMap: Record<string, Prisma.ApartmentOrderByWithRelationInput> = {
    newest: { postedAt: "desc" },
    oldest: { postedAt: "asc" },
    price_asc: { price: "asc" },
    price_desc: { price: "desc" },
    rooms_asc: { rooms: "asc" },
    rooms_desc: { rooms: "desc" },
  };
  const sort = p.get("sort") ?? "newest";
  const orderBy = sortMap[sort] ?? sortMap["newest"];

  const page = Math.max(1, parseInt(p.get("page") ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const [apartments, total] = await Promise.all([
    prisma.apartment.findMany({ where, orderBy, skip, take: PAGE_SIZE }),
    prisma.apartment.count({ where }),
  ]);

  return NextResponse.json({
    apartments,
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  });
}
