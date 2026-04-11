"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

interface Prediction {
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  slug: string;
  matchedTerm: string;
}

interface Perp {
  asset: string;
  markPrice: string;
  funding: string;
  volume24h: string;
  openInterest: string;
  source?: string;
}

interface Option {
  instrument: string;
  markPrice: string;
  markIv: string;
  openInterest: string;
  type: string;
}

interface AnalysisResult {
  content: {
    summary: string;
    keywords: string[];
    entities: string[];
    tickers: string[];
  };
  predictions: Prediction[];
  perps: Perp[];
  options: Option[];
}

const TERMINAL_LINES = [
  "> INITIALIZING LINK SCANNER...",
  "> SCRAPING TARGET URL...",
  "> EXTRACTING ENTITIES & TICKERS...",
  "> QUERYING POLYMARKET API...",
  "> SCANNING HYPERLIQUID PERPS...",
  "> FETCHING DERIBIT OPTIONS...",
  "> RANKING BY VOLUME & RELEVANCE...",
  "> COMPILING RESULTS...",
];

function formatVolume(v: number | string): string {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num) || num === 0) return "—";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPrice(p: string | number): string {
  const num = typeof p === "string" ? parseFloat(p) : p;
  if (isNaN(num)) return "—";
  if (num >= 1000) return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (num >= 1) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(6)}`;
}

function formatFunding(f: string): string {
  if (f === "—" || f === "0") return "—";
  const num = parseFloat(f);
  if (isNaN(num)) return "—";
  const pct = (num * 100).toFixed(4);
  return `${num >= 0 ? "+" : ""}${pct}%`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [terminalLine, setTerminalLine] = useState(0);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;
    setTerminalHistory([]);
    setTerminalLine(0);

    const interval = setInterval(() => {
      setTerminalLine((prev) => {
        if (prev < TERMINAL_LINES.length) {
          setTerminalHistory((h) => [...h, TERMINAL_LINES[prev]]);
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleScan = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const totalMarkets =
    (result?.predictions?.length || 0) +
    (result?.perps?.length || 0) +
    (result?.options?.length || 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-forest border-b-2 border-lime/30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo.png"
              alt="Capacitr"
              width={40}
              height={40}
              className="rounded-sharp"
            />
            <div>
              <h1 className="font-grotesk text-lime text-xl font-bold tracking-wider">
                Capacitr Markets
              </h1>
              <span className="font-mono text-[10px] text-sage-dark tracking-[0.2em]">
                LINK → MARKETS DISCOVERY
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="font-mono text-[10px] text-sage-dark">SYSTEM_ONLINE</span>
          </div>
        </div>
      </header>

      {/* Hero / Input Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* PCB grid background */}
          <div className="absolute inset-0 pcb-grid pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 pt-16 pb-12 relative">
            {/* Micro label */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-[1px] bg-orange" />
              <span className="font-mono text-[10px] text-orange tracking-[0.3em]">
                MARKET_SCANNER_V2
              </span>
            </div>

            <h2 className="font-grotesk text-4xl md:text-5xl font-bold text-forest mb-3 leading-tight">
              Drop a Link.
              <br />
              <span className="text-orange">Discover Markets.</span>
            </h2>

            <p className="font-mono text-sm text-forest/60 mb-8 max-w-lg">
              PASTE ANY URL — NEWS, TWEETS, ARTICLES — AND INSTANTLY FIND RELEVANT
              PREDICTION MARKETS, PERPETUAL FUTURES, AND OPTIONS.
            </p>

            {/* Input area */}
            <div className="bg-forest rounded-sharp p-1 shadow-brutal mb-4">
              <div className="flex items-center gap-1">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1 font-mono text-[9px] text-lime/50 tracking-widest">
                    INPUT_URL
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    placeholder="https://example.com/article..."
                    className="w-full bg-forest-light text-lime font-mono text-sm px-3 pt-5 pb-3 rounded-sharp outline-none placeholder:text-sage-dark/40 border border-lime/10 focus:border-lime/30 transition-colors"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={handleScan}
                  disabled={loading || !url.trim()}
                  className="bg-orange text-white font-grotesk font-bold text-sm px-6 py-4 rounded-sharp shadow-brutal-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  <Search size={16} />
                  {loading ? "SCANNING..." : "SCAN"}
                </button>
              </div>
            </div>

            {/* Quick hint */}
            <div className="flex items-center gap-4 font-mono text-[10px] text-forest/40">
              <span className="flex items-center gap-1">
                <ChevronRight size={10} /> NEWS ARTICLES
              </span>
              <span className="flex items-center gap-1">
                <ChevronRight size={10} /> TWEETS / X POSTS
              </span>
              <span className="flex items-center gap-1">
                <ChevronRight size={10} /> BLOG POSTS
              </span>
              <span className="flex items-center gap-1">
                <ChevronRight size={10} /> RESEARCH
              </span>
            </div>
          </div>
        </section>

        {/* Loading Terminal */}
        {loading && (
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <div className="bg-forest rounded-sharp border border-lime/20 overflow-hidden shadow-brutal">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-lime/10">
                <div className="w-2 h-2 rounded-full bg-orange" />
                <div className="w-2 h-2 rounded-full bg-lime/50" />
                <div className="w-2 h-2 rounded-full bg-sage-dark/30" />
                <span className="font-mono text-[10px] text-sage-dark/60 ml-2">
                  CAPACITR_TERMINAL
                </span>
              </div>
              <div className="p-4 font-mono text-xs text-lime/80 space-y-1 min-h-[200px]">
                {terminalHistory.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-lime/40">
                      [{String(i + 1).padStart(2, "0")}]
                    </span>
                    <span>{line}</span>
                    {i === terminalHistory.length - 1 && (
                      <span className="text-lime cursor-blink">█</span>
                    )}
                  </div>
                ))}
                {terminalLine >= TERMINAL_LINES.length && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-orange">⟳</span>
                    <span className="text-orange">
                      AWAITING SERVER RESPONSE...
                    </span>
                    <span className="text-orange cursor-blink">█</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <div className="bg-red-900/20 border border-red-500/30 rounded-sharp p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-red-400 tracking-widest">
                  ERROR_RESPONSE
                </span>
              </div>
              <p className="font-mono text-sm text-red-400">{error}</p>
            </div>
          </section>
        )}

        {/* Results */}
        {result && (
          <section ref={resultRef} className="max-w-6xl mx-auto px-4 pb-16">
            {/* Summary bar */}
            <div className="bg-forest rounded-sharp p-4 mb-6 shadow-brutal">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-lime" />
                  <span className="font-mono text-[10px] text-lime/60 tracking-widest">
                    ANALYSIS_COMPLETE
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-sage-dark">
                    {totalMarkets} MARKETS FOUND
                  </span>
                </div>
              </div>
              <p className="font-mono text-xs text-sage-dark/80 leading-relaxed">
                {result.content.summary}
              </p>
              {result.content.entities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {result.content.entities.map((e, i) => (
                    <span
                      key={i}
                      className="bg-lime/10 text-lime font-mono text-[10px] px-2 py-0.5 rounded-sharp border border-lime/20"
                    >
                      {e}
                    </span>
                  ))}
                  {result.content.tickers.map((t, i) => (
                    <span
                      key={`t-${i}`}
                      className="bg-orange/10 text-orange font-mono text-[10px] px-2 py-0.5 rounded-sharp border border-orange/20"
                    >
                      ${t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Prediction Markets */}
            {result.predictions.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-orange rounded-sharp" />
                  <BarChart3 size={16} className="text-orange" />
                  <h3 className="font-grotesk text-lg font-bold text-forest">
                    Prediction Markets
                  </h3>
                  <span className="font-mono text-[10px] text-forest/40 ml-2">
                    POLYMARKET
                  </span>
                  <span className="font-mono text-[10px] bg-orange/10 text-orange px-2 py-0.5 rounded-sharp ml-auto">
                    {result.predictions.length} RESULTS
                  </span>
                </div>
                <div className="grid gap-3">
                  {result.predictions.map((p, i) => (
                    <div
                      key={i}
                      className="bg-white/60 backdrop-blur border border-forest/10 rounded-sharp p-4 hover:border-orange/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <span className="font-mono text-[9px] text-forest/30 tracking-widest">
                            PREDICTION_{String(i + 1).padStart(2, "0")}
                          </span>
                          <h4 className="font-grotesk text-sm font-semibold text-forest mt-1 leading-snug">
                            {p.question}
                          </h4>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="font-mono text-[10px] text-forest/40">
                              MATCHED: {p.matchedTerm}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-center">
                            <span className="font-mono text-[9px] text-forest/40 block">
                              YES
                            </span>
                            <span className="font-grotesk text-lg font-bold text-green-600">
                              {(p.yesPrice * 100).toFixed(0)}¢
                            </span>
                          </div>
                          <div className="w-px h-8 bg-forest/10" />
                          <div className="text-center">
                            <span className="font-mono text-[9px] text-forest/40 block">
                              NO
                            </span>
                            <span className="font-grotesk text-lg font-bold text-red-500">
                              {(p.noPrice * 100).toFixed(0)}¢
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-forest/5">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[10px] text-forest/50">
                            VOL: {formatVolume(p.volume)}
                          </span>
                          <span className="font-mono text-[10px] text-forest/50">
                            LIQ: {formatVolume(p.liquidity)}
                          </span>
                        </div>
                        {p.slug && (
                          <a
                            href={`https://polymarket.com/event/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-[10px] text-orange hover:text-orange/80 transition-colors"
                          >
                            TRADE ON POLYMARKET
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Perpetual Futures */}
            {result.perps.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-lime rounded-sharp" />
                  <TrendingUp size={16} className="text-lime" />
                  <h3 className="font-grotesk text-lg font-bold text-forest">
                    Perpetual Futures
                  </h3>
                  <span className="font-mono text-[10px] text-forest/40 ml-2">
                    HYPERLIQUID
                  </span>
                  <span className="font-mono text-[10px] bg-lime/10 text-forest px-2 py-0.5 rounded-sharp ml-auto">
                    {result.perps.length} RESULTS
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.perps.map((p, i) => (
                    <div
                      key={i}
                      className="bg-white/60 backdrop-blur border border-forest/10 rounded-sharp p-4 hover:border-lime/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-mono text-[9px] text-forest/30 tracking-widest">
                            PERPETUAL
                          </span>
                          <h4 className="font-grotesk text-base font-bold text-forest">
                            {p.asset}
                            <span className="text-forest/40 font-normal">
                              -USD
                            </span>
                          </h4>
                        </div>
                        <span className="font-grotesk text-xl font-bold text-forest">
                          {formatPrice(p.markPrice)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="font-mono text-[9px] text-forest/30 block">
                            FUNDING
                          </span>
                          <span
                            className={`font-mono text-xs ${
                              parseFloat(p.funding) > 0
                                ? "text-green-600"
                                : parseFloat(p.funding) < 0
                                ? "text-red-500"
                                : "text-forest/60"
                            }`}
                          >
                            {formatFunding(p.funding)}
                          </span>
                        </div>
                        <div>
                          <span className="font-mono text-[9px] text-forest/30 block">
                            24H VOL
                          </span>
                          <span className="font-mono text-xs text-forest/60">
                            {formatVolume(p.volume24h)}
                          </span>
                        </div>
                        <div>
                          <span className="font-mono text-[9px] text-forest/30 block">
                            OI
                          </span>
                          <span className="font-mono text-xs text-forest/60">
                            {formatVolume(p.openInterest)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-forest/5">
                        {p.source && (
                          <span className="font-mono text-[9px] text-forest/30">
                            {p.source}
                          </span>
                        )}
                        <a
                          href={`https://app.hyperliquid.xyz/trade/${p.source?.includes("HIP-3") ? "@" : ""}${p.asset}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-[10px] text-orange hover:text-orange/80 transition-colors"
                        >
                          TRADE ON HYPERLIQUID
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            {result.options.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-forest rounded-sharp" />
                  <Activity size={16} className="text-forest" />
                  <h3 className="font-grotesk text-lg font-bold text-forest">
                    Options
                  </h3>
                  <span className="font-mono text-[10px] text-forest/40 ml-2">
                    DERIBIT
                  </span>
                  <span className="font-mono text-[10px] bg-forest/10 text-forest px-2 py-0.5 rounded-sharp ml-auto">
                    {result.options.length} RESULTS
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {result.options.map((o, i) => (
                    <div
                      key={i}
                      className="bg-white/60 backdrop-blur border border-forest/10 rounded-sharp p-4 hover:border-forest/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[9px] text-forest/30 tracking-widest">
                          OPTION
                        </span>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-sharp ${
                            o.type === "CALL"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {o.type}
                        </span>
                      </div>
                      <h4 className="font-mono text-xs font-semibold text-forest mb-3 break-all">
                        {o.instrument}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-mono text-[9px] text-forest/30 block">
                            MARK IV
                          </span>
                          <span className="font-mono text-sm font-bold text-forest">
                            {parseFloat(o.markIv).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="font-mono text-[9px] text-forest/30 block">
                            OPEN INTEREST
                          </span>
                          <span className="font-mono text-sm text-forest/60">
                            {parseFloat(o.openInterest).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-forest/5">
                        <a
                          href={`https://www.deribit.com/options/${o.instrument.split("-")[0]}/${o.instrument}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-[10px] text-orange hover:text-orange/80 transition-colors"
                        >
                          TRADE ON DERIBIT
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {totalMarkets === 0 && (
              <div className="text-center py-12">
                <span className="font-mono text-sm text-forest/40">
                  NO MARKETS FOUND FOR THIS CONTENT. TRY A DIFFERENT URL.
                </span>
              </div>
            )}
          </section>
        )}

        {/* Feature pills when no results */}
        {!result && !loading && (
          <section className="max-w-4xl mx-auto px-4 pb-16">
            <div className="pcb-line mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/40 backdrop-blur border border-forest/10 rounded-sharp p-5 hover:border-orange/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={16} className="text-orange" />
                  <span className="font-mono text-[10px] text-orange tracking-widest">
                    PREDICTIONS
                  </span>
                </div>
                <h3 className="font-grotesk text-sm font-bold text-forest mb-1">
                  Polymarket
                </h3>
                <p className="font-mono text-[10px] text-forest/50 leading-relaxed">
                  YES/NO PREDICTION MARKETS WITH LIVE PRICING, VOLUME, AND
                  LIQUIDITY DATA.
                </p>
              </div>
              <div className="bg-white/40 backdrop-blur border border-forest/10 rounded-sharp p-5 hover:border-lime/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-lime" />
                  <span className="font-mono text-[10px] text-forest tracking-widest">
                    PERPETUALS
                  </span>
                </div>
                <h3 className="font-grotesk text-sm font-bold text-forest mb-1">
                  HyperLiquid
                </h3>
                <p className="font-mono text-[10px] text-forest/50 leading-relaxed">
                  PERPETUAL FUTURES WITH MARK PRICE, FUNDING RATES, AND OPEN
                  INTEREST.
                </p>
              </div>
              <div className="bg-white/40 backdrop-blur border border-forest/10 rounded-sharp p-5 hover:border-forest/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-forest" />
                  <span className="font-mono text-[10px] text-forest tracking-widest">
                    OPTIONS
                  </span>
                </div>
                <h3 className="font-grotesk text-sm font-bold text-forest mb-1">
                  Deribit
                </h3>
                <p className="font-mono text-[10px] text-forest/50 leading-relaxed">
                  CRYPTO OPTIONS WITH IMPLIED VOLATILITY, OPEN INTEREST, AND
                  CONTRACT DETAILS.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-forest/10 bg-forest">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo.png"
              alt="Capacitr"
              width={24}
              height={24}
            />
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
            v2.0 — ALL DATA SOURCED LIVE
          </span>
        </div>
      </footer>
    </div>
  );
}
