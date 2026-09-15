export type PerformanceRecord = {
  result: "WIN" | "LOSS" | "BREAKEVEN";
  realizedRMultiple: number;
};

export type PerformanceSummary = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalR: number;
  averageR: number;
};

export function calculatePerformanceSummary(
  records: PerformanceRecord[]
): PerformanceSummary {
  const totalTrades = records.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakevens: 0,
      winRate: 0,
      totalR: 0,
      averageR: 0,
    };
  }

  const wins = records.filter(
    (record) => record.result === "WIN"
  ).length;

  const losses = records.filter(
    (record) => record.result === "LOSS"
  ).length;

  const breakevens = records.filter(
    (record) => record.result === "BREAKEVEN"
  ).length;

  const totalR = records.reduce(
    (sum, record) => sum + record.realizedRMultiple,
    0
  );

  const averageR = totalR / totalTrades;

  const decidedTrades = wins + losses;

  const winRate =
    decidedTrades === 0
      ? 0
      : (wins / decidedTrades) * 100;

  return {
    totalTrades,
    wins,
    losses,
    breakevens,
    winRate,
    totalR,
    averageR,
  };
}