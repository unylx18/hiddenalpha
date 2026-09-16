$path = "components\dashboard-top-signal.tsx"

$content = Get-Content $path -Raw

# Remove old levelRange useMemo block
$content = [regex]::Replace(
    $content,
    '  const levelRange =\s*useMemo\(\(\) => \{.*?\}, \[\s*setup,\s*best\?\.livePrice,\s*\]\);',
    '',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

# Replace the old Setup Map panel with the real candlestick chart.
$pattern = '(?s)                <div className="rounded-xl border border-white/\[0\.055\] bg-\[#07090d\] p-4">.*?                </div>\s*\n\s*              </div>\s*\n\s*\n              <AssetStates'

$replacement = @'
                <SetupCandleChart
                  symbol={best.symbol}
                  signalTimeframe={setup.timeframe}
                  direction={setup.direction}
                  livePrice={best.livePrice ?? setup.entryPrice}
                  entryPrice={setup.entryPrice}
                  stopLossPrice={setup.stopLossPrice}
                  takeProfit1Price={setup.takeProfit1Price}
                  takeProfit2Price={setup.takeProfit2Price}
                />

              </div>

              <AssetStates
'@

$content = [regex]::Replace(
    $content,
    $pattern,
    $replacement
)

Set-Content $path $content

Write-Host "Overview live chart patch completed."