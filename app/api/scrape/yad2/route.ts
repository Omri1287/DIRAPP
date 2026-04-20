import { NextResponse } from "next/server";
import { scrapeYad2 } from "@/lib/scrapers/yad2";
import { addLog } from "@/app/api/scrape/status/route";

export async function POST() {
  addLog("yad2", "Scrape started (direct Yad2 API)");

  scrapeYad2(100)
    .then((count) => {
      const msg = `Done — ${count} listings saved`;
      console.log(`[Yad2] ${msg}`);
      addLog("yad2", msg);
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Yad2] scrape error:", msg);
      addLog("yad2", `ERROR: ${msg}`);
    });

  return NextResponse.json({ success: true, started: true });
}
