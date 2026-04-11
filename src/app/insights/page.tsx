"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Lock,
  Search,
  Globe,
  Tag,
  BarChart3,
  Clock,
  TrendingUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface InsightsData {
  totalSearches: number;
  uniqueUrls: number;
  topEntities: { name: string; count: number }[];
  topCategories: { name: string; count: number }[];
  topPredictions: { question: string; count: number }[];
  dailySearches: { date: string; count: number }[];
  recentSearches: {
    id: string;
    url: string;
    summary: string;
    entities: string[];
    tickers: string[];
    categories: string[];
    predictionsCount: number;
    perpsCount: number;
    optionsCount: number;
    createdAt: string;
  }[];
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateUrl(url: string, max = 50): string {
  if (url.length <= max) return url;
  return url.substring(0, max) + "...";
}

export default function InsightsPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsData | null>(null);
  const [, setError] = useState("");
  const [authError, setAuthError] = useState("");

  const handleAuth = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setAuthError("");

    try {
      const res = await fetch(`/api/insights?password=${encodeURIComponent(password)}`);
      if (res.status === 401) {
        setAuthError("INVALID ACCESS CODE");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch data");

      const result = await res.json();
      setData(result);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxEntityCount = data?.topEntities?.[0]?.count || 1;
  const maxDailyCount = data?.dailySearches
    ? Math.max(...data.dailySearches.map((d) => d.count), 1)
    : 1;

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-forest border-b-2 border-lime/30">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <Image src="/brand/logo.png" alt="Capacitr" width={40} height={40} className="rounded-sharp" />
            <div>
              <h1 className="font-grotesk text-lime text-xl font-bold tracking-wider">
                Capacitr Insights
              </h1>
              <span className="font-mono text-[10px] text-sage-dark tracking-[0.2em]">
                ADMIN_DASHBOARD
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md px-4">
            <div className="bg-forest rounded-sharp p-8 shadow-brutal">
              <div className="flex items-center gap-2 mb-6">
                <Lock size={16} className="text-lime" />
                <span className="font-mono text-[10px] text-lime/60 tracking-widest">
                  ACCESS_CONTROL
                </span>
              </div>

              <h2 className="font-grotesk text-2xl font-bold text-lime mb-2">
                Enter Access Code
              </h2>
              <p className="font-mono text-[10px] text-sage-dark/60 mb-6">
                THIS DASHBOARD IS RESTRICTED TO AUTHORIZED PERSONNEL.
              </p>

              <div className="mb-4">
                <span className="font-mono text-[9px] text-lime/40 tracking-widest block mb-1">
                  PASSWORD
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  className="w-full bg-forest-light text-lime font-mono text-sm px-3 py-3 rounded-sharp outline-none border border-lime/10 focus:border-lime/30 transition-colors"
                  placeholder="••••••••••"
                />
              </div>

              {authError && (
                <p className="font-mono text-[10px] text-red-400 mb-4">{authError}</p>
              )}

              <button
                onClick={handleAuth}
                disabled={loading || !password.trim()}
                className="w-full bg-orange text-white font-grotesk font-bold text-sm px-6 py-3 rounded-sharp shadow-brutal-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40"
              >
                {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-forest border-b-2 border-lime/30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo.png" alt="Capacitr" width={40} height={40} className="rounded-sharp" />
            <div>
              <h1 className="font-grotesk text-lime text-xl font-bold tracking-wider">
                Capacitr Insights
              </h1>
              <span className="font-mono text-[10px] text-sage-dark tracking-[0.2em]">
                ADMIN_DASHBOARD
              </span>
            </div>
          </div>
          <a
            href="/"
            className="font-mono text-[10px] text-sage-dark hover:text-lime transition-colors flex items-center gap-1"
          >
            ← BACK TO SCANNER
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-forest rounded-sharp p-5 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <Search size={14} className="text-lime" />
              <span className="font-mono text-[9px] text-lime/50 tracking-widest">
                TOTAL_SEARCHES
              </span>
            </div>
            <span className="font-grotesk text-3xl font-bold text-lime">
              {data.totalSearches}
            </span>
          </div>
          <div className="bg-forest rounded-sharp p-5 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-orange" />
              <span className="font-mono text-[9px] text-orange/50 tracking-widest">
                UNIQUE_URLS
              </span>
            </div>
            <span className="font-grotesk text-3xl font-bold text-orange">
              {data.uniqueUrls}
            </span>
          </div>
          <div className="bg-forest rounded-sharp p-5 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={14} className="text-sage" />
              <span className="font-mono text-[9px] text-sage/50 tracking-widest">
                TOP_CATEGORY
              </span>
            </div>
            <span className="font-grotesk text-xl font-bold text-sage">
              {data.topCategories[0]?.name || "—"}
            </span>
            <span className="font-mono text-[10px] text-sage-dark block mt-1">
              {data.topCategories[0]?.count || 0} SEARCHES
            </span>
          </div>
          <div className="bg-forest rounded-sharp p-5 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-lime" />
              <span className="font-mono text-[9px] text-lime/50 tracking-widest">
                TOP_ENTITY
              </span>
            </div>
            <span className="font-grotesk text-xl font-bold text-lime">
              {data.topEntities[0]?.name || "—"}
            </span>
            <span className="font-mono text-[10px] text-sage-dark block mt-1">
              {data.topEntities[0]?.count || 0} MENTIONS
            </span>
          </div>
        </div>

        {/* Searches Over Time Chart */}
        {data.dailySearches.length > 0 && (
          <div className="bg-white/40 backdrop-blur border border-forest/10 rounded-sharp p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-forest" />
              <span className="font-mono text-[10px] text-forest/60 tracking-widest">
                SEARCHES_OVER_TIME
              </span>
            </div>
            <div className="flex items-end gap-1 h-32">
              {data.dailySearches.slice(-30).map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-orange/80 hover:bg-orange transition-colors rounded-sharp min-h-[2px]"
                    style={{
                      height: `${(d.count / maxDailyCount) * 100}%`,
                    }}
                    title={`${d.date}: ${d.count} searches`}
                  />
                  {i % 5 === 0 && (
                    <span className="font-mono text-[7px] text-forest/30 -rotate-45 origin-top-left whitespace-nowrap">
                      {d.date.slice(5)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Entities */}
          <div className="bg-white/40 backdrop-blur border border-forest/10 rounded-sharp p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={16} className="text-orange" />
              <span className="font-mono text-[10px] text-forest/60 tracking-widest">
                TOP_ENTITIES
              </span>
            </div>
            <div className="space-y-2">
              {data.topEntities.slice(0, 12).map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-forest/30 w-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-xs text-forest font-semibold">
                        {e.name}
                      </span>
                      <span className="font-mono text-[10px] text-forest/40">
                        {e.count}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-forest/5 rounded-sharp overflow-hidden">
                      <div
                        className="h-full bg-orange/70 rounded-sharp transition-all"
                        style={{ width: `${(e.count / maxEntityCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white/40 backdrop-blur border border-forest/10 rounded-sharp p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-lime" />
              <span className="font-mono text-[10px] text-forest/60 tracking-widest">
                TOP_CATEGORIES
              </span>
            </div>
            <div className="space-y-3">
              {data.topCategories.map((c, i) => {
                const maxCat = data.topCategories[0]?.count || 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-forest/30 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-xs text-forest font-semibold">
                          {c.name}
                        </span>
                        <span className="font-mono text-[10px] text-forest/40">
                          {c.count}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-forest/5 rounded-sharp overflow-hidden">
                        <div
                          className="h-full bg-lime/60 rounded-sharp transition-all"
                          style={{ width: `${(c.count / maxCat) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top Predictions in same card */}
            <div className="mt-6 pt-6 border-t border-forest/10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-orange" />
                <span className="font-mono text-[10px] text-forest/60 tracking-widest">
                  TOP_PREDICTION_MARKETS
                </span>
              </div>
              <div className="space-y-2">
                {data.topPredictions.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-forest/30 mt-0.5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[10px] text-forest/80 leading-relaxed flex-1">
                      {p.question}
                    </span>
                    <span className="font-mono text-[10px] text-orange shrink-0">
                      ×{p.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Searches Table */}
        <div className="bg-white/40 backdrop-blur border border-forest/10 rounded-sharp p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-forest" />
            <span className="font-mono text-[10px] text-forest/60 tracking-widest">
              RECENT_SEARCHES
            </span>
            <span className="font-mono text-[10px] text-forest/30 ml-auto">
              LAST {data.recentSearches.length} ENTRIES
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-forest/10">
                  <th className="font-mono text-[9px] text-forest/40 tracking-widest text-left pb-2 pr-4">
                    TIME
                  </th>
                  <th className="font-mono text-[9px] text-forest/40 tracking-widest text-left pb-2 pr-4">
                    URL
                  </th>
                  <th className="font-mono text-[9px] text-forest/40 tracking-widest text-left pb-2 pr-4">
                    ENTITIES
                  </th>
                  <th className="font-mono text-[9px] text-forest/40 tracking-widest text-center pb-2 pr-2">
                    PRED
                  </th>
                  <th className="font-mono text-[9px] text-forest/40 tracking-widest text-center pb-2 pr-2">
                    PERP
                  </th>
                  <th className="font-mono text-[9px] text-forest/40 tracking-widest text-center pb-2">
                    OPT
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentSearches.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-forest/5 hover:bg-forest/5 transition-colors"
                  >
                    <td className="font-mono text-[10px] text-forest/50 py-2 pr-4 whitespace-nowrap">
                      {timeAgo(s.createdAt)}
                    </td>
                    <td className="font-mono text-[10px] text-forest/70 py-2 pr-4 max-w-[200px]">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange transition-colors flex items-center gap-1"
                        title={s.url}
                      >
                        {truncateUrl(s.url, 40)}
                        <ExternalLink size={8} className="shrink-0" />
                      </a>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {s.entities.slice(0, 3).map((e, j) => (
                          <span
                            key={j}
                            className="font-mono text-[9px] bg-forest/5 text-forest/60 px-1.5 py-0.5 rounded-sharp"
                          >
                            {e}
                          </span>
                        ))}
                        {s.entities.length > 3 && (
                          <span className="font-mono text-[9px] text-forest/30">
                            +{s.entities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-[10px] text-center py-2 pr-2">
                      <span
                        className={
                          s.predictionsCount > 0 ? "text-orange font-bold" : "text-forest/30"
                        }
                      >
                        {s.predictionsCount}
                      </span>
                    </td>
                    <td className="font-mono text-[10px] text-center py-2 pr-2">
                      <span
                        className={
                          s.perpsCount > 0 ? "text-lime font-bold" : "text-forest/30"
                        }
                      >
                        {s.perpsCount}
                      </span>
                    </td>
                    <td className="font-mono text-[10px] text-center py-2">
                      <span
                        className={
                          s.optionsCount > 0 ? "text-forest font-bold" : "text-forest/30"
                        }
                      >
                        {s.optionsCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-forest/10 bg-forest">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="Capacitr" width={24} height={24} />
            <a
              href="https://capacitr.lol"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-sage-dark hover:text-lime transition-colors flex items-center gap-1"
            >
              POWERED BY CAPACITR
              <ArrowRight size={10} />
            </a>
          </div>
          <span className="font-mono text-[10px] text-sage-dark/40">
            ADMIN INSIGHTS PANEL
          </span>
        </div>
      </footer>
    </div>
  );
}
