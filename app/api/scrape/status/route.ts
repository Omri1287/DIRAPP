import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const log: { time: string; source: string; message: string }[] = [];

export function addLog(source: string, message: string) {
  log.unshift({ time: new Date().toISOString(), source, message });
  if (log.length > 50) log.pop();
}

export async function GET() {
  const stats = await prisma.apartment.groupBy({
    by: ["source"],
    _count: true,
  }).catch(() => []);

  return NextResponse.json({ log, stats });
}
