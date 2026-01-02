import { NextResponse } from "next/server";
import type { Candle } from "@/lib/niftyAnalysis";

interface YahooResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        currency?: string;
        exchangeName?: string;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          close?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: unknown;
  };
}

const NIFTY_SYMBOL = "%5ENSEI";
const RANGE = "6mo";
const INTERVAL = "1d";

function normalizeCandles(raw: YahooResponse): Candle[] {
  const result = raw.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const closes = quote?.close ?? [];
  const opens = quote?.open ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const volumes = quote?.volume ?? [];

  const candles: Candle[] = [];

  timestamps.forEach((ts, idx) => {
    const close = closes[idx];
    const open = opens[idx];
    const high = highs[idx];
    const low = lows[idx];

    if (
      close === null ||
      open === null ||
      high === null ||
      low === null ||
      close === undefined ||
      open === undefined ||
      high === undefined ||
      low === undefined
    ) {
      return;
    }

    const volume = volumes[idx];

    candles.push({
      date: new Date(ts * 1000).toISOString(),
      close,
      open,
      high,
      low,
      volume: typeof volume === "number" ? volume : undefined,
    });
  });

  return candles;
}

export async function GET() {
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${NIFTY_SYMBOL}?range=${RANGE}&interval=${INTERVAL}&includePrePost=false&events=history`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 15 * 60 },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance responded with ${response.status}`);
    }

    const payload = (await response.json()) as YahooResponse;
    const candles = normalizeCandles(payload);

    if (candles.length === 0) {
      throw new Error("No candle data available for Nifty");
    }

    const meta = payload.chart?.result?.[0]?.meta ?? null;

    return NextResponse.json({
      candles,
      meta,
      source: "Yahoo Finance",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch Nifty data", error);
    return NextResponse.json(
      { error: "Unable to retrieve Nifty data at this time" },
      { status: 502 },
    );
  }
}
