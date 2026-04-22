"use client";

import { useState, useEffect, useCallback } from "react";

interface Stats {
  total: number;
  yad2Count: number;
  facebookCount: number;
  lastScrape: string | null;
}

interface LogEntry {
  time: string;
  source: string;
  message: string;
}

export function ScraperPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [fbPosts, setFbPosts] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbPassword, setFbPassword] = useState("");
  const [authSaved, setAuthSaved] = useState(false);
  const [yad2Status, setYad2Status] = useState<"idle" | "running" | "done" | "error">("idle");
  const [fbStatus, setFbStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [yad2Msg, setYad2Msg] = useState("");
  const [fbMsg, setFbMsg] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/scrape/status");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.log ?? []);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadLogs();
    fetch("/api/scrape/fb-auth").then((r) => r.json()).then((d) => {
      if (d.email) setFbEmail(d.email);
    });
    const interval = setInterval(() => { loadStats(); loadLogs(); }, 15000);
    return () => clearInterval(interval);
  }, [loadStats, loadLogs]);

  const saveFbAuth = async () => {
    if (!fbEmail || !fbPassword) return;
    await fetch("/api/scrape/fb-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fbEmail, password: fbPassword }),
    });
    setFbPassword("");
    setAuthSaved(true);
    setTimeout(() => setAuthSaved(false), 3000);
  };

  const saveConfig = async () => {
    const groupUrls = fbPosts
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    await fetch("/api/scrape/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupUrls }),
    });
    alert("Facebook group URLs saved.");
  };

  const runYad2 = async () => {
    setYad2Status("running");
    setYad2Msg("Started — check the terminal for progress. Stats will refresh automatically.");
    try {
      const res = await fetch("/api/scrape/yad2", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setYad2Status("done");
        setYad2Msg("Scraping in background — listings will appear in a few minutes.");
        // Poll stats every 30s
        const interval = setInterval(() => loadStats(), 30000);
        setTimeout(() => clearInterval(interval), 15 * 60 * 1000);
      } else {
        setYad2Status("error");
        setYad2Msg(data.error ?? "Unknown error");
      }
    } catch {
      setYad2Status("error");
      setYad2Msg("Request failed — check the dev server is running.");
    }
  };

  const runFacebook = async () => {
    const groupUrls = fbPosts.split("\n").map((u) => u.trim()).filter((u) => u.startsWith("http"));
    if (!groupUrls.length) {
      setFbMsg("Paste at least one Facebook group URL.");
      return;
    }
    setFbStatus("running");
    setFbMsg("Browser scraping started — takes a few minutes per group.");
    try {
      const res = await fetch("/api/scrape/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupUrls }),
      });
      const data = await res.json();
      if (data.success) {
        setFbStatus("done");
        setFbMsg("Scraping in background — check the Scraper Log below.");
        const iv = setInterval(() => loadStats(), 30000);
        setTimeout(() => clearInterval(iv), 15 * 60 * 1000);
      } else {
        setFbStatus("error");
        setFbMsg(data.error ?? "Unknown error");
      }
    } catch {
      setFbStatus("error");
      setFbMsg("Request failed.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total listings" value={stats.total} />
          <StatCard label="From Yad2" value={stats.yad2Count} color="red" />
          <StatCard label="From Facebook" value={stats.facebookCount} color="blue" />
          <StatCard
            label="Last scraped"
            value={
              stats.lastScrape
                ? new Date(stats.lastScrape).toLocaleDateString()
                : "Never"
            }
          />
        </div>
      )}

      {/* Yad2 */}
      <div className="rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">Yad2</span>
          <h3 className="font-semibold text-gray-900">Scrape Yad2 listings</h3>
        </div>
        <p className="text-sm text-gray-500">
          Fetches up to 100 rental listings directly from yad2.co.il — no API key needed. Takes ~30 seconds.
        </p>
        <div className="flex items-center gap-4">
          <ScrapeButton onClick={runYad2} status={yad2Status} label="Scrape Yad2 Now" />
          {yad2Msg && (
            <span className={`text-sm ${yad2Status === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {yad2Msg}
            </span>
          )}
        </div>
      </div>

      {/* Facebook scraper */}
      <div className="rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">Facebook</span>
          <h3 className="font-semibold text-gray-900">Scrape Facebook groups</h3>
        </div>
        <p className="text-sm text-gray-500">
          Paste Facebook group URLs (one per line). Facebook requires login even for public groups — enter your credentials below.
        </p>
        <details className="text-sm border border-gray-200 rounded-xl p-4">
          <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
            Facebook login credentials {authSaved && <span className="text-emerald-600 ml-2">✓ Saved</span>}
          </summary>
          <div className="flex flex-col gap-3 mt-3">
            <p className="text-xs text-gray-400">Stored locally on your machine only. Use a test account if preferred.</p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                value={fbEmail}
                onChange={(e) => setFbEmail(e.target.value)}
                placeholder="Facebook email"
                className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="password"
                value={fbPassword}
                onChange={(e) => setFbPassword(e.target.value)}
                placeholder="Password"
                className="flex-1 min-w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={saveFbAuth}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition"
              >
                Save
              </button>
            </div>
          </div>
        </details>
        <textarea
          value={fbPosts}
          onChange={(e) => setFbPosts(e.target.value)}
          rows={4}
          placeholder={"https://www.facebook.com/groups/...\nhttps://www.facebook.com/groups/..."}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          dir="ltr"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <ScrapeButton onClick={runFacebook} status={fbStatus} label="Scrape Facebook Now" />
          {fbMsg && (
            <span className={`text-sm ${fbStatus === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {fbMsg}
            </span>
          )}
        </div>
      </div>

      {/* Live log */}
      {logs.length > 0 && (
        <div className="rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900 text-sm">Scraper Log</h3>
          <div className="flex flex-col gap-1 font-mono text-xs max-h-48 overflow-y-auto">
            {logs.map((entry, i) => (
              <div key={i} className={`flex gap-2 ${entry.message.startsWith("ERROR") ? "text-red-600" : "text-gray-700"}`}>
                <span className="text-gray-400 shrink-0">{new Date(entry.time).toLocaleTimeString()}</span>
                <span className="text-blue-600 shrink-0">[{entry.source}]</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: "red" | "blue";
}) {
  const textColor =
    color === "red"
      ? "text-red-600"
      : color === "blue"
      ? "text-blue-600"
      : "text-gray-900";

  return (
    <div className="rounded-2xl border border-gray-200 p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function ScrapeButton({
  onClick,
  status,
  label,
}: {
  onClick: () => void;
  status: "idle" | "running" | "done" | "error";
  label: string;
}) {
  const isRunning = status === "running";
  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition"
    >
      {isRunning && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {isRunning ? "Running…" : label}
    </button>
  );
}
