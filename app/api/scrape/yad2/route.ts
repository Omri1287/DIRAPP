import { NextResponse } from "next/server";
import { scrapeYad2 } from "@/lib/scrapers/yad2";

export async function POST() {
  // Fire and forget — scraping takes several minutes
  scrapeYad2()
    .then((count) => console.log(`[Yad2] scraped ${count} listings`))
    .catch((err) => console.error("[Yad2] scrape error:", err));

  return NextResponse.json({ success: true, started: true });
}
