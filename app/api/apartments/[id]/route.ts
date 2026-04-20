import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apartment = await prisma.apartment.findUnique({ where: { id } });
  if (!apartment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(apartment);
}
