"use client";

import { useState, useEffect } from "react";

interface Stats {
  total: number;
  yad2Count: number;
  facebookCount: number;
  lastScrape: string | null;
}

export function ScraperPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [fbUrls, setFbUrls] = useState("");
  const [yad2Status, setYad2Status] = useState<"idle" | "running" | "done" | "error">("idle");
  const [fbStatus, setFbStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [yad2Msg, setYad2Msg] = useState("");
  const [fbMsg, setFbMsg] = useState("");

  const loadStats = async () => {
    const res = await fetch("/api/stats");
    if (res.ok) setStats(await res.json());
  };

  const loadConfig = async () => {
    const res = await fetch("/api/scrape/config");
    if (res.ok) {
      const { groupUrls } = await res.json();
      setFbUrls((groupUrls as string[]).join("\n"));
    }
  };

  useEffect(() => {
    loadStats();
    loadConfig();
  }, []);

  const saveConfig = async () => {
    const groupUrls = fbUrls
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
    setYad2Msg("");
    const res = await fetch("/api/scrape/yad2", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setYad2Status("done");
      setYad2Msg(`${data.count} listings saved.`);
      loadStats();
    } else {
      setYad2Status("error");
      setYad2Msg(data.error ?? "Unknown error");
    }
  };

  const runFacebook = async () => {
    setFbStatus("running");
    setFbMsg("");
    const groupUrls = fbUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    const res = await fetch("/api/scrape/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupUrls }),
    });
    const data = await res.json();
    if (data.success) {
      setFbStatus("done");
      setFbMsg(`${data.count} listings saved.`);
      loadStats();
    } else {
      setFbStatus("error");
      setFbMsg(data.error ?? "Unknown error");
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
          Fetches up to 200 rental listings from yad2.co.il in Tel Aviv using Apify.
          This may take a few minutes.
        </p>
        <div className="flex items-center gap-4">
          <ScrapeButton
            onClick={runYad2}
            status={yad2Status}
            label="Scrape Yad2 Now"
          />
          {yad2Msg && (
            <span className={`text-sm ${yad2Status === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {yad2Msg}
            </span>
          )}
        </div>
      </div>

      {/* Facebook */}
      <div className="rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">Facebook</span>
          <h3 className="font-semibold text-gray-900">Scrape Facebook groups</h3>
        </div>
        <p className="text-sm text-gray-500">
          Paste one Facebook group URL per line (public groups only). Posts are parsed
          for price, rooms, neighborhood, and contact info.
        </p>
        <textarea
          value={fbUrls}
          onChange={(e) => setFbUrls(e.target.value)}
          rows={5}
          placeholder={"https://www.facebook.com/groups/...\nhttps://www.facebook.com/groups/..."}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          dir="ltr"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={saveConfig}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition"
          >
            Save URLs
          </button>
          <ScrapeButton
            onClick={runFacebook}
            status={fbStatus}
            label="Scrape Facebook Now"
          />
          {fbMsg && (
            <span className={`text-sm ${fbStatus === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {fbMsg}
            </span>
          )}
        </div>
      </div>
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
