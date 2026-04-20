import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const cfg = await prisma.scraperConfig.findUnique({
    where: { source: "facebook" },
  });
  const groupUrls = cfg
    ? (JSON.parse(cfg.config) as { groupUrls: string[] }).groupUrls
    : [];
  return NextResponse.json({ groupUrls });
}

export async function POST(req: NextRequest) {
  const { groupUrls } = await req.json();
  if (!Array.isArray(groupUrls)) {
    return NextResponse.json({ error: "groupUrls must be an array" }, { status: 400 });
  }

  await prisma.scraperConfig.upsert({
    where: { source: "facebook" },
    create: {
      source: "facebook",
      config: JSON.stringify({ groupUrls }),
    },
    update: { config: JSON.stringify({ groupUrls }) },
  });

  return NextResponse.json({ success: true });
}
