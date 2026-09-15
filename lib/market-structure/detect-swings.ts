export type MarketStructureCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SwingPoint = {
  timestamp: string;
  index: number;
  price: number;
  type: "HIGH" | "LOW";
  label: "HH" | "HL" | "LH" | "LL" | null;
};

export type StructureBreak = {
  timestamp: string;
  index: number;
  price: number;
  type: "BOS" | "CHoCH";
  direction: "BULLISH" | "BEARISH";
  brokenSwing: "HIGH" | "LOW";
  brokenPrice: number;
};

export type MarketStructureResult = {
  swings: SwingPoint[];
  breaks: StructureBreak[];
  trend: "BULLISH" | "BEARISH" | "RANGE";
};

type DetectSwingOptions = {
  leftBars?: number;
  rightBars?: number;
};

export function detectMarketStructure(
  candles: MarketStructureCandle[],
  options: DetectSwingOptions = {}
): MarketStructureResult {
  const leftBars = options.leftBars ?? 2;
  const rightBars = options.rightBars ?? 2;

  if (
    candles.length <
    leftBars + rightBars + 1
  ) {
    return {
      swings: [],
      breaks: [],
      trend: "RANGE",
    };
  }

  // ========================================
  // 1. DETECT RAW SWINGS
  // ========================================

  const rawSwings: SwingPoint[] = [];

  for (
    let i = leftBars;
    i < candles.length - rightBars;
    i++
  ) {
    const current = candles[i];

    let isSwingHigh = true;
    let isSwingLow = true;

    for (
      let j = i - leftBars;
      j < i;
      j++
    ) {
      if (
        candles[j].high >= current.high
      ) {
        isSwingHigh = false;
      }

      if (
        candles[j].low <= current.low
      ) {
        isSwingLow = false;
      }
    }

    for (
      let j = i + 1;
      j <= i + rightBars;
      j++
    ) {
      if (
        candles[j].high >= current.high
      ) {
        isSwingHigh = false;
      }

      if (
        candles[j].low <= current.low
      ) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      rawSwings.push({
        timestamp: current.timestamp,
        index: i,
        price: current.high,
        type: "HIGH",
        label: null,
      });
    }

    if (isSwingLow) {
      rawSwings.push({
        timestamp: current.timestamp,
        index: i,
        price: current.low,
        type: "LOW",
        label: null,
      });
    }
  }

  rawSwings.sort(
    (a, b) => a.index - b.index
  );

  // ========================================
  // 2. REMOVE CONSECUTIVE SAME-TYPE SWINGS
  // ========================================

  const swings: SwingPoint[] = [];

  for (const swing of rawSwings) {
    const previous =
      swings[swings.length - 1];

    if (!previous) {
      swings.push(swing);
      continue;
    }

    if (
      previous.type === swing.type
    ) {
      if (
        swing.type === "HIGH" &&
        swing.price > previous.price
      ) {
        swings[swings.length - 1] =
          swing;
      }

      if (
        swing.type === "LOW" &&
        swing.price < previous.price
      ) {
        swings[swings.length - 1] =
          swing;
      }

      continue;
    }

    swings.push(swing);
  }

  // ========================================
  // 3. CLASSIFY HH / HL / LH / LL
  // ========================================

  let previousHigh:
    | SwingPoint
    | null = null;

  let previousLow:
    | SwingPoint
    | null = null;

  for (const swing of swings) {
    if (swing.type === "HIGH") {
      if (previousHigh) {
        swing.label =
          swing.price >
          previousHigh.price
            ? "HH"
            : "LH";
      }

      previousHigh = swing;
    }

    if (swing.type === "LOW") {
      if (previousLow) {
        swing.label =
          swing.price >
          previousLow.price
            ? "HL"
            : "LL";
      }

      previousLow = swing;
    }
  }

  // ========================================
  // 4. DETECT STRUCTURE BREAKS
  // ========================================

  const breaks: StructureBreak[] = [];

  let structureTrend:
    | "BULLISH"
    | "BEARISH"
    | "RANGE" = "RANGE";

  let lastBrokenHighIndex = -1;
  let lastBrokenLowIndex = -1;

  let latestHigh:
    | SwingPoint
    | null = null;

  let latestLow:
    | SwingPoint
    | null = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    // ----------------------------------------
    // Update confirmed swing references
    // ----------------------------------------

    for (const swing of swings) {
      if (swing.index >= i) {
        break;
      }

      if (swing.type === "HIGH") {
        latestHigh = swing;
      }

      if (swing.type === "LOW") {
        latestLow = swing;
      }
    }

    // ----------------------------------------
    // Bullish break
    // ----------------------------------------

    if (
      latestHigh &&
      latestHigh.index !==
        lastBrokenHighIndex &&
      candle.close > latestHigh.price
    ) {
      const type =
        structureTrend === "BEARISH"
          ? "CHoCH"
          : "BOS";

      breaks.push({
        timestamp: candle.timestamp,
        index: i,
        price: candle.close,
        type,
        direction: "BULLISH",
        brokenSwing: "HIGH",
        brokenPrice: latestHigh.price,
      });

      structureTrend = "BULLISH";

      lastBrokenHighIndex =
        latestHigh.index;
    }

    // ----------------------------------------
    // Bearish break
    // ----------------------------------------

    if (
      latestLow &&
      latestLow.index !==
        lastBrokenLowIndex &&
      candle.close < latestLow.price
    ) {
      const type =
        structureTrend === "BULLISH"
          ? "CHoCH"
          : "BOS";

      breaks.push({
        timestamp: candle.timestamp,
        index: i,
        price: candle.close,
        type,
        direction: "BEARISH",
        brokenSwing: "LOW",
        brokenPrice: latestLow.price,
      });

      structureTrend = "BEARISH";

      lastBrokenLowIndex =
        latestLow.index;
    }
  }

  // ========================================
  // 5. DETERMINE CURRENT TREND
  // ========================================

  const classifiedSwings =
    swings.filter(
      (swing) =>
        swing.label !== null
    );

  const recentSwings =
    classifiedSwings.slice(-6);

  const bullishCount =
    recentSwings.filter(
      (swing) =>
        swing.label === "HH" ||
        swing.label === "HL"
    ).length;

  const bearishCount =
    recentSwings.filter(
      (swing) =>
        swing.label === "LH" ||
        swing.label === "LL"
    ).length;

  let trend:
    | "BULLISH"
    | "BEARISH"
    | "RANGE" = "RANGE";

  if (
    bullishCount >= 3 &&
    bullishCount > bearishCount
  ) {
    trend = "BULLISH";
  } else if (
    bearishCount >= 3 &&
    bearishCount > bullishCount
  ) {
    trend = "BEARISH";
  }

  return {
    swings,
    breaks,
    trend,
  };
}