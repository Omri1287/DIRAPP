import { NextRequest, NextResponse } from "next/server";

const APIFY_BASE = "https://api.apify.com/v2";
const API_KEY = process.env.APIFY_API_KEY!;

export async function GET(req: NextRequest) {
  const actor = req.nextUrl.searchParams.get("actor") ?? "swerve~yad2-scraper";

  const meRes = await fetch(`${APIFY_BASE}/users/me?token=${API_KEY}`);
  const me = await meRes.json();
  if (!meRes.ok) return NextResponse.json({ error: "API key invalid", detail: me });

  const actorRes = await fetch(`${APIFY_BASE}/acts/${actor}?token=${API_KEY}`);
  const actorData = await actorRes.json();
  if (!actorRes.ok) {
    return NextResponse.json({ apiKeyOk: true, actorError: actorData });
  }

  return NextResponse.json({
    apiKeyOk: true,
    user: me.data?.username,
    actor: { id: actorData.data?.id, name: actorData.data?.name },
  });
}

// POST: run actor with custom input and return first 3 results
export async function POST(req: NextRequest) {
  const { actor, input } = await req.json();
  const safeActor = (actor as string).replace("/", "~");

  const runRes = await fetch(`${APIFY_BASE}/acts/${safeActor}/runs?token=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const runData = await runRes.json();

  if (!runRes.ok) {
    return NextResponse.json({ error: "Run failed", status: runRes.status, detail: runData });
  }

  const runId = runData.data?.id;

  // Poll for up to 5 minutes
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${API_KEY}`);
    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === "SUCCEEDED") {
      const dsId = statusData.data?.defaultDatasetId;
      const itemsRes = await fetch(`${APIFY_BASE}/datasets/${dsId}/items?token=${API_KEY}&limit=3`);
      const items = await itemsRes.json();
      return NextResponse.json({ success: true, runId, itemCount: statusData.data?.stats?.outputDatasetItems ?? 0, sample: items });
    }

    if (status === "FAILED" || status === "ABORTED") {
      return NextResponse.json({ error: `Run ${status}`, runId, detail: statusData.data });
    }
  }

  return NextResponse.json({ error: "Timed out after 5 min", runId });
}
