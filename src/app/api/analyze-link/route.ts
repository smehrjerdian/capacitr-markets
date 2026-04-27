import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function scrapeContent(url: string): Promise<string> {
  const res = await fetch("https://r.jina.ai/" + encodeURIComponent(url), {
    headers: { Accept: "text/plain", "X-Return-Format": "text" },
  });
  if (!res.ok) throw new Error("Failed to scrape URL");
  const text = await res.text();
  return text.slice(0, 4000);
}

async function extractEntities(content: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You analyze content and extract structured data for finding relevant prediction markets and trading opportunities. You must identify tradeable assets aggressively — if the content mentions oil, extract OIL, WTI, crude. If it mentions gold, extract GOLD, PAXG. If it mentions any crypto, extract the ticker. If it mentions a company, extract the stock ticker. Think like a trader reading this content — what would they want to trade? Respond ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Analyze this content and extract:
- summary: 2-3 sentence summary
- keywords: array of 5-8 keywords optimized for prediction market search
- entities: array of named entities (people, companies, assets, events)
- tickers: array of trading ticker symbols DIRECTLY relevant to this content. Include crypto tickers (BTC, ETH, SOL), commodity tickers (OIL, GOLD, SILVER, NATGAS), stock tickers (AAPL, TSLA, NVDA, PLTR, MSFT, AMZN, META, NFLX, AMD, INTC, COIN, MSTR, GME, GOOG), index tickers (SP500, NASDAQ), and forex (EUR, JPY). ONLY include tickers that are actually discussed or directly implied by the content. Do NOT pad with unrelated assets — if it's about oil, only include oil-related tickers. If it's about Tesla, include TSLA and maybe SP500 but not random crypto.
- categories: array from [crypto, politics, sports, ai, tech, finance, entertainment, science, world, commodities]

Content:
${content}

Respond as JSON: {"summary":"...","keywords":[...],"entities":[...],"tickers":[...],"categories":[...]}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("LLM extraction failed: " + err);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const SEARCH_EXPAND_STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "will", "would",
  "could", "should", "may", "might", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "and", "or", "but", "not",
  "this", "that", "it", "its", "if", "about", "above", "below", "between",
  "into", "through", "before", "after", "during", "what", "which", "who",
  "how", "when", "where", "why", "all", "each", "some", "any", "no",
  "more", "most", "other", "new", "next", "last", "first", "than",
  "price", "market", "prediction", "bet", "will", "does", "did", "has",
  "have", "had", "been", "being", "do", "going", "get", "make", "over",
  "under", "hit", "reach", "above", "below",
]);

function expandSearchTerms(terms: string[]): string[] {
  const expanded = new Set<string>();
  const seen = new Set<string>();

  for (const term of terms) {
    const lower = term.toLowerCase().trim();
    if (seen.has(lower)) continue;
    seen.add(lower);
    expanded.add(term);

    // For multi-word terms, also add significant individual words
    const words = lower.split(/\s+/);
    if (words.length >= 2) {
      for (const word of words) {
        if (word.length < 3 || SEARCH_EXPAND_STOP.has(word)) continue;
        if (seen.has(word)) continue;
        seen.add(word);
        expanded.add(word);
      }
    }
  }

  return Array.from(expanded);
}

return JSON.parse(cleaned);
}

async function searchPolymarket(keywords: string[], entities: string[]) {
  const allResults: any[] = [];
  const seen = new Set<string>();
  const searchTerms = expandSearchTerms([...new Set([...entities, ...keywords])]);

  for (const term of searchTerms.slice(0, 10)) {
    try {
      const res = await fetch(
        `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(term)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const termResults: any[] = [];

      for (const event of data.events || []) {
        for (const market of event.markets || []) {
          if (seen.has(market.conditionId)) continue;
          seen.add(market.conditionId);
          if (!market.active || market.closed) continue;

          let outcomePrices: string[];
          try {
            outcomePrices = JSON.parse(market.outcomePrices || "[]");
          } catch {
            continue;
          }

          termResults.push({
            question: market.question || event.title,
            yesPrice: parseFloat(outcomePrices[0] || "0"),
            noPrice: parseFloat(outcomePrices[1] || "0"),
            volume: parseFloat(market.volume || "0"),
            liquidity: parseFloat(market.liquidityNum || market.liquidity || "0"),
            slug: event.slug || market.slug || "",
            matchedTerm: term,
          });
        }
      }

      const top3 = termResults
        .sort((a, b) => (b.volume + b.liquidity) - (a.volume + a.liquidity))
        .slice(0, 3);
      allResults.push(...top3);
    } catch {
      // skip failed terms
    }
  }

  return allResults.sort((a, b) => b.volume - a.volume).slice(0, 15);
}

const XYZ_ALIASES: Record<string, string[]> = {
  oil: ["xyz:BRENTOIL", "xyz:CL"], "crude oil": ["xyz:BRENTOIL", "xyz:CL"],
  crude: ["xyz:BRENTOIL", "xyz:CL"], brent: ["xyz:BRENTOIL"],
  "brent oil": ["xyz:BRENTOIL"], wti: ["xyz:CL"], cl: ["xyz:CL"],
  petroleum: ["xyz:BRENTOIL", "xyz:CL"], brentoil: ["xyz:BRENTOIL"],
  opec: ["xyz:BRENTOIL", "xyz:CL"],
  gold: ["xyz:GOLD"], silver: ["xyz:SILVER"],
  precious: ["xyz:GOLD", "xyz:SILVER"], "precious metals": ["xyz:GOLD", "xyz:SILVER"],
  commodities: ["xyz:GOLD", "xyz:SILVER", "xyz:BRENTOIL", "xyz:CL", "xyz:NATGAS"],
  metals: ["xyz:GOLD", "xyz:SILVER"],
  "natural gas": ["xyz:NATGAS"], natgas: ["xyz:NATGAS"], gas: ["xyz:NATGAS"],
  "s&p": ["xyz:SP500"], "s&p 500": ["xyz:SP500"], "s&p500": ["xyz:SP500"],
  sp500: ["xyz:SP500"], spx: ["xyz:SP500"],
  xyz100: ["xyz:XYZ100"], nasdaq: ["xyz:XYZ100"], "nasdaq 100": ["xyz:XYZ100"],
  "stock market": ["xyz:SP500", "xyz:XYZ100"], equities: ["xyz:SP500", "xyz:XYZ100"],
  indices: ["xyz:SP500", "xyz:XYZ100"],
  palantir: ["xyz:PLTR"], pltr: ["xyz:PLTR"],
  apple: ["xyz:AAPL"], aapl: ["xyz:AAPL"],
  tesla: ["xyz:TSLA"], tsla: ["xyz:TSLA"],
  microsoft: ["xyz:MSFT"], msft: ["xyz:MSFT"],
  amazon: ["xyz:AMZN"], amzn: ["xyz:AMZN"],
  nvidia: ["xyz:NVDA"], nvda: ["xyz:NVDA"],
  meta: ["xyz:META"],
  netflix: ["xyz:NFLX"], nflx: ["xyz:NFLX"],
  amd: ["xyz:AMD"],
  intel: ["xyz:INTC"], intc: ["xyz:INTC"],
  coinbase: ["xyz:COIN"], coin: ["xyz:COIN"],
  microstrategy: ["xyz:MSTR"], mstr: ["xyz:MSTR"], strategy: ["xyz:MSTR"],
  gamestop: ["xyz:GME"], gme: ["xyz:GME"],
  euro: ["xyz:EUR"], eur: ["xyz:EUR"], eurusd: ["xyz:EUR"],
  yen: ["xyz:JPY"], jpy: ["xyz:JPY"], usdjpy: ["xyz:JPY"],
};

async function fetchXyzPerp(coin: string): Promise<any | null> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "l2Book", coin }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.levels || data.levels.length < 2) return null;
    const bestBid = data.levels[0]?.[0]?.px;
    const bestAsk = data.levels[1]?.[0]?.px;
    if (!bestBid && !bestAsk) return null;
    const mid = bestBid && bestAsk
      ? ((parseFloat(bestBid) + parseFloat(bestAsk)) / 2).toFixed(3)
      : bestBid || bestAsk;
    return { asset: coin.replace("xyz:", ""), markPrice: mid, funding: "—", volume24h: "—", openInterest: "—", source: "HyperLiquid (HIP-3)" };
  } catch {
    return null;
  }
}

async function searchHyperliquid(tickers: string[], entities: string[]) {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });
    if (!res.ok) return [];
    const [meta, ctxs] = await res.json();
    const universe: { name: string }[] = meta.universe || [];
    const assetIndex = new Map<string, number>();
    universe.forEach((u, i) => { assetIndex.set(u.name.toLowerCase(), i); });

    const ALIASES: Record<string, string[]> = {
      bitcoin: ["btc"], btc: ["btc"], ethereum: ["eth"], eth: ["eth"],
      solana: ["sol"], sol: ["sol"], dogecoin: ["doge", "kpepe"], doge: ["doge"],
      gold: ["paxg"], polygon: ["pol", "matic"], avalanche: ["avax"], cardano: ["ada"],
      chainlink: ["link"], polkadot: ["dot"], celestia: ["tia"], jupiter: ["jup"],
      ripple: ["xrp"], litecoin: ["ltc"], cosmos: ["atom"], filecoin: ["fil"],
      render: ["render", "rndr"], near: ["near"], injective: ["inj"], sei: ["sei"],
      arbitrum: ["arb"], optimism: ["op"], worldcoin: ["wld"], pendle: ["pendle"],
      pepe: ["kpepe", "pepe"], bonk: ["kbonk", "bonk"], shiba: ["kshib"], floki: ["kfloki"],
      trump: ["trump"], hyperliquid: ["hype"], virtual: ["virtual"], ai16z: ["ai16z"],
      bera: ["bera"], sui: ["sui"],
    };

    const matchedTickers = new Set<string>();
    const xyzCoins = new Set<string>();
    const allTerms = [...tickers.map(t => t.toLowerCase()), ...entities.map(e => e.toLowerCase())];

    for (const term of allTerms) {
      if (assetIndex.has(term)) matchedTickers.add(universe[assetIndex.get(term)!].name);
      if (assetIndex.has("k" + term)) matchedTickers.add(universe[assetIndex.get("k" + term)!].name);
      const aliases = ALIASES[term];
      if (aliases) { for (const alias of aliases) { if (assetIndex.has(alias)) matchedTickers.add(universe[assetIndex.get(alias)!].name); } }
      const xyzMatches = XYZ_ALIASES[term];
      if (xyzMatches) { for (const coin of xyzMatches) xyzCoins.add(coin); }
    }

    const results: any[] = [];
    for (const ticker of Array.from(matchedTickers)) {
      const idx = universe.findIndex(u => u.name === ticker);
      if (idx === -1 || !ctxs[idx]) continue;
      const ctx = ctxs[idx];
      results.push({ asset: ticker, markPrice: ctx.markPx || "0", funding: ctx.funding || "0", volume24h: ctx.dayNtlVlm || "0", openInterest: ctx.openInterest || "0" });
    }

    if (xyzCoins.size > 0) {
      const xyzResults = await Promise.all(Array.from(xyzCoins).map(coin => fetchXyzPerp(coin)));
      for (const r of xyzResults) { if (r) results.push(r); }
    }

    return results.sort((a, b) => (parseFloat(b.volume24h) || 0) - (parseFloat(a.volume24h) || 0)).slice(0, 8);
  } catch {
    return [];
  }
}

async function searchDeribit(tickers: string[], entities: string[]) {
  const DERIBIT_CURRENCIES = new Set(["BTC", "ETH", "SOL", "XRP", "MATIC", "USDC"]);
  const ALIASES: Record<string, string> = {
    bitcoin: "BTC", btc: "BTC", ethereum: "ETH", eth: "ETH",
    solana: "SOL", sol: "SOL", xrp: "XRP", ripple: "XRP",
    polygon: "MATIC", matic: "MATIC", crypto: "BTC",
  };
  const currencies = new Set<string>();
  for (const ticker of tickers) {
    const upper = ticker.toUpperCase();
    if (DERIBIT_CURRENCIES.has(upper)) currencies.add(upper);
    const alias = ALIASES[ticker.toLowerCase()];
    if (alias && DERIBIT_CURRENCIES.has(alias)) currencies.add(alias);
  }
  for (const entity of entities) {
    const alias = ALIASES[entity.toLowerCase()];
    if (alias && DERIBIT_CURRENCIES.has(alias)) currencies.add(alias);
  }
  if (currencies.size === 0) return [];
  const results: any[] = [];
  for (const currency of Array.from(currencies)) {
    try {
      const res = await fetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`);
      if (!res.ok) continue;
      const data = await res.json();
      const options = (data.result || [])
        .filter((o: any) => o.open_interest > 0 && o.mark_iv > 0)
        .sort((a: any, b: any) => (b.volume_usd || 0) - (a.volume_usd || 0))
        .slice(0, 3);
      for (const opt of options) {
        results.push({
          instrument: opt.instrument_name,
          markPrice: String(opt.mark_price || 0),
          markIv: String(opt.mark_iv || 0),
          openInterest: String(opt.open_interest || 0),
          type: opt.instrument_name?.includes("-C") ? "CALL" : "PUT",
        });
      }
    } catch {
      // skip
    }
  }
  return results.slice(0, 5);
}

async function logSearch(url: string, extracted: any, predictions: any[], perps: any[], options: any[]) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from("market_searches").insert({
      url,
      summary: extracted.summary || "",
      keywords: extracted.keywords || [],
      entities: extracted.entities || [],
      tickers: extracted.tickers || [],
      categories: extracted.categories || [],
      predictions_count: predictions.length,
      perps_count: perps.length,
      options_count: options.length,
      predictions_data: predictions,
      perps_data: perps,
      options_data: options,
    });
  } catch (e) { console.error("Failed to log search:", e); }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const content = await scrapeContent(url);
    const extracted = await extractEntities(content);
    const tickers = extracted.tickers || [];
    const entities = extracted.entities || [];

    const [predictions, perps, options] = await Promise.all([
      searchPolymarket(extracted.keywords || [], entities),
      searchHyperliquid(tickers, entities),
      searchDeribit(tickers, entities),
    ]);

    // Log search asynchronously (don't block response)
    logSearch(url, extracted, predictions, perps, options);

    return NextResponse.json({
      content: { summary: extracted.summary || "", keywords: extracted.keywords || [], entities: extracted.entities || [], tickers },
      predictions, perps, options,
    });
  } catch (err: any) {
    console.error("analyze-link error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
