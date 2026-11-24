import assert from "node:assert/strict";
import test from "node:test";
import {
  JOURNAL_CSV_COLUMNS, calculateJournalStatistics, decodeJournalStorage,
  exportJournalCsv, importJournalCsv, tradeNetPnl, validateClosedTrade,
} from "../lib/trading/v2/journal.ts";

const base = {
  id: "trade-001", symbol: "BTCUSDT", direction: "LONG",
  quantity: 1, entry: 100, exit: 110, feesUsd: 2,
  openedAt: "2025-01-01T09:00:00.000Z",
  closedAt: "2025-01-01T10:00:00.000Z",
  riskUsd: 10, notes: "Breakout trade",
};

function trade(overrides = {}) {
  return validateClosedTrade({...base,...overrides});
}

test("LONG and SHORT closed trade P&L include exact reported fees", () => {
  assert.equal(tradeNetPnl(trade()), 8);
  assert.equal(tradeNetPnl(trade({
    id:"short-001", direction:"SHORT", quantity:2,
    entry:100, exit:90, feesUsd:3,
  })), 17);
  assert.equal(tradeNetPnl(trade({exit:100, feesUsd:0})), 0);
});

test("statistics: wins, losses, profit factor, max realized drawdown and average R", () => {
  const rows = [
    trade({id:"a", entry:100,exit:110, feesUsd:0, riskUsd:10, closedAt:"2025-01-01T10:00:00.000Z"}),
    trade({id:"b", entry:100,exit:85, feesUsd:0, riskUsd:5, closedAt:"2025-01-02T10:00:00.000Z"}),
    trade({id:"c", entry:100,exit:105, feesUsd:0, riskUsd:5, closedAt:"2025-01-03T10:00:00.000Z"}),
  ];
  const stats = calculateJournalStatistics(rows);
  assert.equal(stats.totalTrades, 3);
  assert.equal(stats.wins, 2);
  assert.equal(stats.losses, 1);
  assert.equal(stats.netPnlUsdEquivalent, 0);
  assert.equal(stats.grossProfit, 15);
  assert.equal(stats.grossLoss, 15);
  assert.equal(stats.profitFactor, 1);
  assert.equal(stats.maxRealizedDrawdownUsd, 15);
  assert.ok(Math.abs(stats.averageR + 1/3) < 1e-9);
  assert.ok(Math.abs(stats.winRatePercent - 200/3) < 1e-9);
  assert.deepEqual(stats.equityPoints.map(x => x.cumulativePnl), [10,-5,0]);
});

test("empty and no-loss statistics never invent a win rate or profit factor", () => {
  const empty = calculateJournalStatistics([]);
  assert.equal(empty.winRatePercent, null);
  assert.equal(empty.profitFactor, null);
  const wins = calculateJournalStatistics([trade()]);
  assert.equal(wins.profitFactor, Infinity);
  assert.equal(wins.winRatePercent, 100);
  assert.equal(wins.averageTradeUsd, 8);
});

test("CSV roundtrip preserves validated closed trades with quoted multiline notes", () => {
  const source = trade({notes:"Moved stop, stayed calm\nRealized \"green\" P&L"});
  const csv=exportJournalCsv([source]);
  assert.ok(csv.startsWith(JOURNAL_CSV_COLUMNS.join(",")));
  const parsed=importJournalCsv(csv);
  assert.deepEqual(parsed,[source]);
});

test("CSV export protects spreadsheet apps from formula injection", () => {
  const csv=exportJournalCsv([trade({notes:"=HYPERLINK(\"https://example.test\", \"oops\")"})]);
  assert.ok(csv.includes('"\'=HYPERLINK('));
  assert.ok(!csv.includes(',"=HYPERLINK('));
  const [parsed]=importJournalCsv(csv);
  assert.ok(parsed.notes.startsWith("'="));
});

test("CSV import rejects bad header, malformed fields and duplicate IDs atomically", () => {
  const header=JOURNAL_CSV_COLUMNS.join(",");
  assert.throws(()=>importJournalCsv("wrong,col\n1,2"),/template/);
  assert.throws(()=>importJournalCsv(header+"\n1,2"),/incorrect number/);
  const once=exportJournalCsv([trade()]);
  assert.throws(()=>importJournalCsv(once+once.split("\r\n")[1]+"\r\n"),/Duplicate trade ID/);
});

test("trades reject bad quantity, missing IDs, future close and open-after-close", () => {
  assert.throws(()=>trade({quantity:0}),/Quantity/);
  assert.throws(()=>trade({feesUsd:-1}),/Fees/);
  assert.throws(()=>trade({id:"<script>"}),/Trade ID/);
  assert.throws(()=>trade({closedAt:"2027-01-01T10:00:00.000Z"}),/future/);
  assert.throws(()=>trade({closedAt:"2025-01-01T08:00:00.000Z"}),/precede/);
});

test("storage decoder validates complete records and duplicate IDs", () => {
  const row=trade();
  assert.deepEqual(decodeJournalStorage(JSON.stringify([row])),[row]);
  assert.throws(()=>decodeJournalStorage(JSON.stringify([row,row])),/duplicate IDs/);
  assert.throws(()=>decodeJournalStorage("not valid JSON"));
});
