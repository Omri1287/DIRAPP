import { NextResponse } from "next/server";
import { scrapeMadlan } from "@/lib/scrapers/madlan";
import { addLog } from "@/app/api/scrape/status/route";

export async function POST() {
  addLog("madlan", "Scrape started (Playwright browser)");

  scrapeMadlan(100, (msg) => addLog("madlan", msg))
    .then((count) => { addLog("madlan", `Done — ${count} listings saved`); })
    .catch((err) => { addLog("madlan", `ERROR: ${err instanceof Error ? err.message : String(err)}`); });

  return NextResponse.json({ success: true, started: true });
}
