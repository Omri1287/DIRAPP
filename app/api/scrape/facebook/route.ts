import { NextRequest, NextResponse } from "next/server";
import { scrapeFacebook } from "@/lib/scrapers/facebook";
import { prisma } from "@/lib/db";
import { addLog } from "@/app/api/scrape/status/route";

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

  addLog("facebook", `Scrape started for ${groupUrls.length} group(s)`);

  scrapeFacebook(groupUrls)
    .then((count) => {
      const msg = `Done — ${count} listings saved`;
      console.log(`[Facebook] ${msg}`);
      addLog("facebook", msg);
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Facebook] scrape error:", msg);
      addLog("facebook", `ERROR: ${msg}`);
    });

  return NextResponse.json({ success: true, started: true });
}
