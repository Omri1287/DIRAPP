import { NextRequest, NextResponse } from "next/server";

const APIFY_BASE = "https://api.apify.com/v2";
const API_KEY = process.env.APIFY_API_KEY!;

export async function GET(req: NextRequest) {
  const actor = req.nextUrl.searchParams.get("actor") ?? "swerve~yad2-scraper";

  // 1. Check API key works
  const meRes = await fetch(`${APIFY_BASE}/users/me?token=${API_KEY}`);
  const me = await meRes.json();
  if (!meRes.ok) {
    return NextResponse.json({ error: "API key invalid", detail: me });
  }

  // 2. Check actor exists
  const actorRes = await fetch(`${APIFY_BASE}/acts/${actor}?token=${API_KEY}`);
  const actorData = await actorRes.json();
  if (!actorRes.ok) {
    return NextResponse.json({
      apiKeyOk: true,
      user: me.data?.username,
      actorError: actorData,
      tip: `Actor "${actor}" not found. Try a different actor ID.`,
    });
  }

  return NextResponse.json({
    apiKeyOk: true,
    user: me.data?.username,
    actor: {
      id: actorData.data?.id,
      name: actorData.data?.name,
      username: actorData.data?.username,
      inputSchema: actorData.data?.inputSchema ? "present" : "none",
    },
  });
}
