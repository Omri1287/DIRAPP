import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const cfg = await prisma.scraperConfig.findUnique({ where: { source: "facebook-auth" } });
  return NextResponse.json({ hasCookies: !!cfg });
}

export async function POST(req: NextRequest) {
  const { cookieStr } = await req.json() as { cookieStr: string };
  if (!cookieStr?.trim()) {
    return NextResponse.json({ error: "cookieStr is required" }, { status: 400 });
  }
  await prisma.scraperConfig.upsert({
    where: { source: "facebook-auth" },
    create: { source: "facebook-auth", config: JSON.stringify({ cookieStr }) },
    update: { config: JSON.stringify({ cookieStr }) },
  });
  return NextResponse.json({ success: true });
}
