import { NextRequest, NextResponse } from "next/server";
import { scrapeFacebook } from "@/lib/scrapers/facebook";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let groupUrls: string[] = body.groupUrls ?? [];

  if (!groupUrls.length) {
    const cfg = await prisma.scraperConfig.findUnique({
      where: { source: "facebook" },
    });
    if (cfg) {
      groupUrls = (JSON.parse(cfg.config) as { groupUrls: string[] }).groupUrls ?? [];
    }
  }

  if (!groupUrls.length) {
    return NextResponse.json(
      { success: false, error: "No Facebook group URLs configured" },
      { status: 400 }
    );
  }

  // Fire and forget — scraping takes 10+ minutes
  scrapeFacebook(groupUrls)
    .then((count) => console.log(`[Facebook] scraped ${count} listings`))
    .catch((err) => console.error("[Facebook] scrape error:", err));

  return NextResponse.json({ success: true, started: true });
}
