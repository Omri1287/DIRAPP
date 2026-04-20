const APIFY_BASE = "https://api.apify.com/v2";
const API_KEY = process.env.APIFY_API_KEY!;

interface RunStatus {
  id: string;
  status: string;
  defaultDatasetId: string;
}

export async function runActor(
  actorId: string,
  input: Record<string, unknown>
): Promise<unknown[]> {
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const text = await runRes.text();
    throw new Error(`Apify run failed: ${runRes.status} ${text}`);
  }

  const { data: run } = (await runRes.json()) as { data: RunStatus };

  const completed = await pollRun(run.id);
  return fetchDataset(completed.defaultDatasetId);
}

async function pollRun(runId: string): Promise<RunStatus> {
  const INTERVAL = 5000;
  const TIMEOUT = 10 * 60 * 1000;
  const start = Date.now();

  while (Date.now() - start < TIMEOUT) {
    await sleep(INTERVAL);
    const res = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${API_KEY}`
    );
    const { data } = (await res.json()) as { data: RunStatus };

    if (data.status === "SUCCEEDED") return data;
    if (data.status === "FAILED" || data.status === "ABORTED") {
      throw new Error(`Apify run ${runId} ended with status: ${data.status}`);
    }
  }

  throw new Error(`Apify run ${runId} timed out`);
}

async function fetchDataset(datasetId: string): Promise<unknown[]> {
  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${API_KEY}&format=json&clean=true`
  );
  if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
