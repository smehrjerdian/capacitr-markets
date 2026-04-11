import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  if (password !== "capacitr2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Get all searches
    const { data: searches, error: searchError } = await supabase
      .from("market_searches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (searchError) throw searchError;

    const allSearches = searches || [];
    const totalSearches = allSearches.length;

    // Unique URLs
    const uniqueUrls = new Set(allSearches.map((s) => s.url)).size;

    // Top entities
    const entityCounts: Record<string, number> = {};
    for (const search of allSearches) {
      for (const entity of search.entities || []) {
        const key = entity.toLowerCase().trim();
        entityCounts[key] = (entityCounts[key] || 0) + 1;
      }
    }
    const topEntities = Object.entries(entityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    // Top categories
    const categoryCounts: Record<string, number> = {};
    for (const search of allSearches) {
      for (const cat of search.categories || []) {
        const key = cat.toLowerCase().trim();
        categoryCounts[key] = (categoryCounts[key] || 0) + 1;
      }
    }
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Top prediction questions
    const predictionCounts: Record<string, number> = {};
    for (const search of allSearches) {
      for (const pred of search.predictions_data || []) {
        if (pred.question) {
          const key = pred.question;
          predictionCounts[key] = (predictionCounts[key] || 0) + 1;
        }
      }
    }
    const topPredictions = Object.entries(predictionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([question, count]) => ({ question, count }));

    // Searches over time (daily counts for last 30 days)
    const searchesByDay: Record<string, number> = {};
    for (const search of allSearches) {
      const day = new Date(search.created_at).toISOString().split("T")[0];
      searchesByDay[day] = (searchesByDay[day] || 0) + 1;
    }
    const dailySearches = Object.entries(searchesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Recent searches (last 50)
    const recentSearches = allSearches.slice(0, 50).map((s) => ({
      id: s.id,
      url: s.url,
      summary: s.summary,
      entities: s.entities || [],
      tickers: s.tickers || [],
      categories: s.categories || [],
      predictionsCount: s.predictions_count || 0,
      perpsCount: s.perps_count || 0,
      optionsCount: s.options_count || 0,
      createdAt: s.created_at,
    }));

    return NextResponse.json({
      totalSearches,
      uniqueUrls,
      topEntities,
      topCategories,
      topPredictions,
      dailySearches,
      recentSearches,
    });
  } catch (err: any) {
    console.error("insights error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
