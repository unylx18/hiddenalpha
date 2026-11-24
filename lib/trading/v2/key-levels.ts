/**
 * Simple swing-based horizontal reference levels (not trading signals).
 * Uses only supplied COMPLETED and validated OHLC candles.
 * Values are derived from local highs/lows; no pivot is invented if absent.
 */
export type KeyLevels = {
  method: "completed-candle-swings";
  referenceClose: number;
  r1: number | null;
  r2: number | null;
  s1: number | null;
  s2: number | null;
};
type LevelCandle = { high: number; low: number; close: number };

export function calculateKeyLevels(candles: LevelCandle[]): KeyLevels {
  const recent = candles.slice(-120);
  const latest = recent.at(-1);
  const price = latest?.close ?? NaN;
  if (recent.length < 7 || !Number.isFinite(price) || price <= 0 ||
      !recent.every(c => Number.isFinite(c.high) && Number.isFinite(c.low) &&
        c.high >= c.low && c.low > 0 && Number.isFinite(c.close) &&
        c.close <= c.high && c.close >= c.low)) {
    throw new Error("Cannot derive levels from incomplete or invalid market candles");
  }

  // Confirm each pivot using two CLOSED bars on either side.
  // Exclude recent unconfirmed bars, and require strictly higher/lower highs/lows.
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 2; i < recent.length - 2; i++) {
    const c = recent[i];
    const left = recent.slice(i - 2, i);
    const right = recent.slice(i + 1, i + 3);
    if ([...left, ...right].every(p => c.high > p.high)) highs.push(c.high);
    if ([...left, ...right].every(p => c.low < p.low)) lows.push(c.low);
  }

  // Avoid duplicated near-identical levels. No need to round to a tick size
  // (tick sizes differ across broker products and are not yet connected).
  const minGap = price * 0.0005;
  const distinct = (values: number[]) => values.filter((v, i, a) =>
    i === 0 || Math.abs(v - a[i - 1]) >= minGap
  );
  const resistance = distinct(highs.filter(v => v > price).sort((a,b)=>a-b));
  const support = distinct(lows.filter(v => v < price).sort((a,b)=>b-a));

  return {
    method: "completed-candle-swings",
    referenceClose: price,
    r1: resistance[0] ?? null,
    r2: resistance[1] ?? null,
    s1: support[0] ?? null,
    s2: support[1] ?? null,
  };
}
