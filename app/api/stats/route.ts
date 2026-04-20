import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [total, yad2Count, facebookCount, latest] = await Promise.all([
    prisma.apartment.count(),
    prisma.apartment.count({ where: { source: "yad2" } }),
    prisma.apartment.count({ where: { source: "facebook" } }),
    prisma.apartment.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  return NextResponse.json({ total, yad2Count, facebookCount, lastScrape: latest?.createdAt ?? null });
}
