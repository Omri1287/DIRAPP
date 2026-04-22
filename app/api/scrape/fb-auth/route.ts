import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const cfg = await prisma.scraperConfig.findUnique({ where: { source: "facebook-auth" } });
  if (!cfg) return NextResponse.json({ email: "" });
  const { email } = JSON.parse(cfg.config) as { email: string; password: string };
  return NextResponse.json({ email }); // never return the password to the client
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string };
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }
  await prisma.scraperConfig.upsert({
    where: { source: "facebook-auth" },
    create: { source: "facebook-auth", config: JSON.stringify({ email, password }) },
    update: { config: JSON.stringify({ email, password }) },
  });
  return NextResponse.json({ success: true });
}
