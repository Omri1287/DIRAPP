import { NextRequest, NextResponse } from "next/server";
import { scrapeFacebook } from "@/lib/scrapers/facebook";
import { prisma } from "@/lib/db";
import { addLog } from "@/app/api/scrape/status/route";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let groupUrls: string[] = body.groupUrls ?? [];

  if (!groupUrls.length) {
    const cfg = await prisma.scraperConfig.findUnique({ where: { source: "facebook" } });
    if (cfg) {
      groupUrls = (JSON.parse(cfg.config) as { groupUrls: string[] }).groupUrls ?? [];
    }
  }

  if (!groupUrls.length) {
    return NextResponse.json({ success: false, error: "No Facebook group URLs configured" }, { status: 400 });
  }

  // Load saved Facebook session cookies (optional but required for most groups)
  let cookieStr: string | undefined;
  const authCfg = await prisma.scraperConfig.findUnique({ where: { source: "facebook-auth" } });
  if (authCfg) {
    cookieStr = (JSON.parse(authCfg.config) as { cookieStr: string }).cookieStr;
  }

  addLog("facebook", `Scrape started for ${groupUrls.length} group(s) via browser`);

  scrapeFacebook(groupUrls, (msg) => addLog("facebook", msg), cookieStr)
    .then((count) => { addLog("facebook", `Done — ${count} listings saved`); })
    .catch((err) => { addLog("facebook", `ERROR: ${err instanceof Error ? err.message : String(err)}`); });

  return NextResponse.json({ success: true, started: true });
}
