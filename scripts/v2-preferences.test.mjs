import assert from "node:assert/strict";
import test from "node:test";
import {parseTerminalPrefs} from "../lib/trading/v2/terminal-preferences.ts";
test("only allowlisted symbol and timeframe can be restored",()=>{
  assert.deepEqual(parseTerminalPrefs('{"symbol":"DOTUSDT","timeframe":"5m"}'),{symbol:"DOTUSDT",timeframe:"5m"});
  assert.deepEqual(parseTerminalPrefs('{"symbol":"XAUUSD","timeframe":"1d"}'),{symbol:"XAUUSD",timeframe:"1d"});
  assert.equal(parseTerminalPrefs('{"symbol":"BAD","timeframe":"15m"}'),null);
  assert.equal(parseTerminalPrefs('{"symbol":"BTCUSDT","timeframe":"bad"}'),null);
  assert.equal(parseTerminalPrefs("{broken"),null);
  assert.equal(parseTerminalPrefs(null),null);
});
