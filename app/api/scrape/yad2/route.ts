import { NextResponse } from "next/server";
import { scrapeYad2 } from "@/lib/scrapers/yad2";

export async function POST() {
  try {
    const count = await scrapeYad2();
    return NextResponse.json({ success: true, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
