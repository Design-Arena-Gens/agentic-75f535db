"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Candle, IndicatorPoint, NiftyAnalysis } from "@/lib/niftyAnalysis";
import { addIndicators, analyzeNifty } from "@/lib/niftyAnalysis";

interface ApiResponse {
  candles: Candle[];
  meta?: {
    regularMarketPrice?: number;
    previousClose?: number;
    currency?: string;
    exchangeName?: string;
    regularMarketTime?: number;
  };
  fetchedAt: string;
  source: string;
  error?: string;
}

interface ChartPoint extends IndicatorPoint {
  label: string;
}

const formatDateLabel = (isoDate: string) =>
  format(new Date(isoDate), "MMM d");

const SentimentBadge = ({ bias }: { bias: NiftyAnalysis["bias"] }) => {
  const styles: Record<
    NiftyAnalysis["bias"],
    { label: string; className: string }
  > = {
    bullish: {
      label: "Bullish Bias",
      className:
        "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-400/40",
    },
    bearish: {
      label: "Bearish Bias",
      className:
        "bg-rose-500/10 text-rose-600 ring-1 ring-inset ring-rose-400/40",
    },
    neutral: {
      label: "Neutral Bias",
      className:
        "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-400/40",
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[bias].className}`}
    >
      {styles[bias].label}
    </span>
  );
};

export function NiftyDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<NiftyAnalysis | null>(null);
  const [meta, setMeta] = useState<ApiResponse["meta"] | undefined>();
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/nifty", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load data");
        }

        const payload = (await response.json()) as ApiResponse;
        if (payload.error) {
          throw new Error(payload.error);
        }

        setCandles(payload.candles);
        setAnalysis(analyzeNifty(payload.candles));
        setMeta(payload.meta);
        setFetchedAt(payload.fetchedAt ?? null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData: ChartPoint[] = useMemo(() => {
    if (candles.length === 0) return [];
    const enriched = addIndicators(candles);
    return enriched.map((point) => ({
      ...point,
      label: formatDateLabel(point.date),
    }));
  }, [candles]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-500" />
      </div>
    );
  }

  if (error || !analysis || chartData.length === 0) {
    return (
      <div className="min-h-[50vh] rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-rose-700 shadow-sm">
        <h2 className="text-lg font-semibold">Unable to load analysis</h2>
        <p className="mt-2 text-sm text-rose-600">
          {error ?? "No data available right now. Please try again later."}
        </p>
      </div>
    );
  }

  const lastPoint = chartData[chartData.length - 1];
  const currency = meta?.currency ?? "INR";
  const formatCurrency = (value?: number | null) =>
    typeof value === "number"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(value)
      : "—";

  const formatPercent = (value?: number | null) =>
    typeof value === "number" ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%` : "—";

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-zinc-100 bg-white/90 p-8 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase text-zinc-500">NSE Nifty 50</p>
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(analysis.lastClose)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
              <span>{formatPercent(analysis.dailyChangePct)}</span>
              <span>5-day momentum {formatPercent(analysis.momentumPct5Day)}</span>
              <span>
                RSI (14):{" "}
                {analysis.rsi14 !== null ? analysis.rsi14.toFixed(1) : "—"}
              </span>
              <SentimentBadge bias={analysis.bias} />
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <p>{meta?.exchangeName ?? "National Stock Exchange"}</p>
            {fetchedAt && (
              <p>
                Updated {format(new Date(fetchedAt), "MMM d, yyyy HH:mm 'IST'")}
              </p>
            )}
            <p>Source: {meta?.exchangeName ?? "Yahoo Finance"}</p>
          </div>
        </div>
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorSMA20" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e4e4e7" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={8}
                minTickGap={20}
              />
              <YAxis
                tickLine={false}
                tickMargin={8}
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("en-IN", {
                    maximumFractionDigits: 0,
                  }).format(value)
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  borderColor: "#e4e4e7",
                }}
                labelStyle={{ color: "#71717a" }}
                formatter={(value, name) => {
                  if (typeof value === "number") {
                    return [
                      new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 2,
                      }).format(value),
                      name,
                    ];
                  }

                  return [value, name];
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#colorClose)"
                name="Close"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="sma20"
                stroke="#22c55e"
                strokeWidth={1.5}
                fill="url(#colorSMA20)"
                name="SMA 20"
                dot={false}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="sma50"
                stroke="#f97316"
                strokeWidth={1.5}
                fill="transparent"
                name="SMA 50"
                dot={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-100 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Next Move
          </p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {analysis.nextMoveHeadline}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {analysis.narrative}
          </p>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Confidence: {analysis.confidence.toUpperCase()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Key Levels
          </p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
            <li className="flex items-center justify-between">
              <span>Support zone</span>
              <span className="font-medium">
                {formatCurrency(analysis.supportZone)}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Resistance zone</span>
              <span className="font-medium">
                {formatCurrency(analysis.resistanceZone)}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>20-day SMA</span>
              <span className="font-medium">
                {formatCurrency(lastPoint.sma20 ?? null)}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>50-day SMA</span>
              <span className="font-medium">
                {formatCurrency(lastPoint.sma50 ?? null)}
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Risk Checklist
          </p>
          <ul className="mt-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
            <li>
              • Watch for a daily close below {formatCurrency(analysis.supportZone)} to
              invalidate the bullish case.
            </li>
            <li>
              • RSI above 70 would warn of exhaustion; below 30 signals capitulation.
            </li>
            <li>
              • Divergence between price and momentum can foreshadow reversals.
            </li>
            <li>• Reassess outlook if price loses both the 20-day and 50-day SMAs.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
