export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorPoint extends Candle {
  sma10?: number;
  sma20?: number;
  sma50?: number;
  rsi14?: number;
}

export interface NiftyAnalysis {
  lastClose: number;
  previousClose: number | null;
  dailyChangePct: number | null;
  bias: "bullish" | "bearish" | "neutral";
  momentumPct5Day: number | null;
  rsi14: number | null;
  supportZone: number | null;
  resistanceZone: number | null;
  nextMoveHeadline: string;
  narrative: string;
  confidence: "high" | "medium" | "low";
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function addIndicators(candles: Candle[]): IndicatorPoint[] {
  const closes = candles.map((candle) => candle.close);
  const gains: number[] = [];
  const losses: number[] = [];

  return candles.map((candle, index) => {
    const windowSlice = (period: number) =>
      closes.slice(Math.max(0, index - period + 1), index + 1);

    const computeSMA = (period: number) => {
      if (index + 1 < period) return undefined;
      const values = windowSlice(period);
      const sum = values.reduce((acc, value) => acc + value, 0);
      return round(sum / period, 2);
    };

    if (index === 0) {
      gains.push(0);
      losses.push(0);
    } else {
      const change = closes[index] - closes[index - 1];
      gains.push(Math.max(change, 0));
      losses.push(Math.max(-change, 0));
    }

    const computeRSI = (period: number) => {
      if (index < period) return undefined;
      const recentGains = gains.slice(index - period + 1, index + 1);
      const recentLosses = losses.slice(index - period + 1, index + 1);
      const averageGain =
        recentGains.reduce((acc, value) => acc + value, 0) / period;
      const averageLoss =
        recentLosses.reduce((acc, value) => acc + value, 0) / period;

      if (averageLoss === 0) return 100;
      if (averageGain === 0) return 0;

      const rs = averageGain / averageLoss;
      return round(100 - 100 / (1 + rs), 2);
    };

    return {
      ...candle,
      sma10: computeSMA(10),
      sma20: computeSMA(20),
      sma50: computeSMA(50),
      rsi14: computeRSI(14),
    };
  });
}

export function analyzeNifty(candles: Candle[]): NiftyAnalysis {
  if (candles.length === 0) {
    throw new Error("No candles provided for analysis");
  }

  const enriched = addIndicators(candles);
  const lastPoint = enriched[enriched.length - 1];
  const previousPoint =
    enriched.length > 1 ? enriched[enriched.length - 2] : null;

  const lastClose = round(lastPoint.close);
  const previousClose = previousPoint ? round(previousPoint.close) : null;
  const dailyChangePct =
    previousPoint && previousPoint.close
      ? round(((lastPoint.close - previousPoint.close) / previousPoint.close) * 100, 2)
      : null;

  const rsi14 = lastPoint.rsi14 ?? null;
  const sma20 = lastPoint.sma20 ?? null;
  const sma50 = lastPoint.sma50 ?? null;

  const fiveDayReference = candles[candles.length - 6] ?? candles[0];
  const momentumPct5Day = fiveDayReference
    ? round(((lastPoint.close - fiveDayReference.close) / fiveDayReference.close) * 100, 2)
    : null;

  const recentWindow = candles.slice(-15);
  const supportZone =
    recentWindow.length > 0
      ? round(
          Math.min(...recentWindow.map((candle) => candle.low)),
          2,
        )
      : null;

  const resistanceZone =
    recentWindow.length > 0
      ? round(
          Math.max(...recentWindow.map((candle) => candle.high)),
          2,
        )
      : null;

  let bias: NiftyAnalysis["bias"] = "neutral";
  if (sma20 && sma50) {
    if (lastClose > sma20 && sma20 > sma50) {
      bias = "bullish";
    } else if (lastClose < sma20 && sma20 < sma50) {
      bias = "bearish";
    }
  }

  let confidence: NiftyAnalysis["confidence"] = "medium";
  if (rsi14 !== null && sma20 !== null && sma50 !== null) {
    const distanceFromSma = Math.abs((lastClose - sma20) / sma20);
    if (distanceFromSma < 0.005 && Math.abs((sma20 - sma50) / sma50) < 0.003) {
      confidence = "low";
    } else if (distanceFromSma > 0.02 || (rsi14 > 68 || rsi14 < 32)) {
      confidence = "high";
    }
  }

  let nextMoveHeadline = "Sideways consolidation likely";
  let narrative =
    "Nifty appears range-bound as key moving averages converge. Traders may focus on breakouts from recent levels.";

  if (bias === "bullish") {
    if (rsi14 !== null && rsi14 > 68) {
      nextMoveHeadline = "Uptrend extended but stretched";
      narrative = `Momentum stays positive with price riding above the 20-day average, though RSI at ${rsi14} signals potential cooling. Pullbacks toward ${sma20 ?? "the 20-day SMA"} could offer dip opportunities while ${supportZone ?? "recent support"} holds.`;
    } else {
      nextMoveHeadline = "Upside continuation favoured";
      narrative = `Price holds above the rising 20- and 50-day averages with ${momentumPct5Day ?? 0}% five-day momentum. A sustained move above ${resistanceZone ?? "recent highs"} would extend the rally, while ${supportZone ?? "nearby support"} remains the risk marker.`;
    }
  } else if (bias === "bearish") {
    if (rsi14 !== null && rsi14 < 32) {
      nextMoveHeadline = "Downtrend oversold";
      narrative = `Nifty is trading beneath its short- and medium-term averages with RSI at ${rsi14}, flagging a stretched sell-off. A pause or mean reversion bounce is possible unless ${supportZone ?? "support"} breaks decisively.`;
    } else {
      nextMoveHeadline = "Downside pressure building";
      narrative = `Lower highs persist beneath the 20- and 50-day averages. Momentum over the last week sits at ${momentumPct5Day ?? 0}%. Losing ${supportZone ?? "recent support"} would unlock deeper retracements, while reclaiming ${sma20 ?? "the 20-day SMA"} is needed to neutralise the trend.`;
    }
  }

  return {
    lastClose,
    previousClose,
    dailyChangePct,
    bias,
    momentumPct5Day,
    rsi14,
    supportZone,
    resistanceZone,
    nextMoveHeadline,
    narrative,
    confidence,
  };
}
