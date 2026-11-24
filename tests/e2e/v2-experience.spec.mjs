import {test,expect} from "@playwright/test";

const BASE="http://127.0.0.1:39322";
const TOUR_KEY="hiddenalpha:v2:tour:v1";
const PREF_KEY="hiddenalpha:v2:terminal-preferences";

async function isolate(page) {
  // No real provider requests or trading operations in deterministic E2E tests.
  await page.route("**/api/v2/market/watchlist",route=>route.fulfill({
    status:503,contentType:"application/json",
    body:JSON.stringify({success:false,provider:"bybit-linear",items:[],
      error:"Provider offline in isolated browser test"}),
  }));
  await page.route(/^https:\/\//,route=>route.abort());
}
async function enterWorkspace(page) {
  await page.goto("/v2");
  const dialog=page.getByRole("dialog",{name:"A clearer way to read the market."});
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button",{name:"Skip for now"}).click();
  await expect(dialog).toHaveCount(0);
}
function analysisSnapshot(url) {
  const request=new URL(url);
  const symbol=request.searchParams.get("symbol");
  const timeframe=request.searchParams.get("timeframe");
  const isBear=symbol==="ETHUSDT";
  const isNeutral=symbol==="SOLUSDT";
  const bias=isBear?"BEARISH":isNeutral?"NEUTRAL":"BULLISH";
  const momentum=symbol==="XRPUSDT"?"BEARISH":bias;
  const score=isBear?-67:isNeutral?0:55;
  return {
    success:true,provider:"bybit",architecture:"stateless-on-demand",
    marketType:"crypto",volumeKind:"traded_contracts",candleCount:300,
    lastClosedAt:new Date(Date.now()-60_000).toISOString(),
    alpha:{
      symbol,timeframe,
      market:{bias,score,confidence:65},
      trend:{direction:bias},momentum:{direction:momentum},
      volatility:{level:"NORMAL"},volume:{ratio:symbol==="XRPUSDT"?0.6:1.6},
    },
  };
}
async function mockAnalysis(page) {
  const seen=[];
  await page.route("**/api/v2/analysis?*",async route=>{
    const url=route.request().url();
    const symbol=new URL(url).searchParams.get("symbol");
    seen.push(symbol);
    if(symbol==="DOTUSDT"){
      await route.fulfill({status:503,contentType:"application/json",
        body:JSON.stringify({success:false,error:"Provider unavailable"})});
    } else {
      await route.fulfill({status:200,contentType:"application/json",
        body:JSON.stringify(analysisSnapshot(url))});
    }
  });
  return seen;
}

test.beforeEach(async({page})=>{
  await isolate(page);
});

test("new user completes 3-step tour once, and replay starts at step one",async({page})=>{
  const pageErrors=[];
  page.on("pageerror",error=>pageErrors.push(error.message));
  await page.goto("/v2");
  const guide=page.getByRole("dialog",{name:"A clearer way to read the market."});
  await expect(guide).toBeVisible();
  await expect(page.getByRole("heading",{name:"Market Command Center."})).toBeVisible();
  await guide.getByRole("button",{name:"Next"}).click();
  await expect(page.getByRole("dialog",{name:"Study the context. Keep control."})).toBeVisible();
  await page.getByRole("button",{name:"Next"}).click();
  await expect(page.getByRole("dialog",{name:"Turn research into a process."})).toBeVisible();
  await page.getByRole("button",{name:"Enter workspace"}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),TOUR_KEY))
    .toBe("completed");

  await page.reload();
  await expect(page.getByRole("heading",{name:"Market Command Center."})).toBeVisible();
  await page.waitForTimeout(550);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button",{name:"Quick tour",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"A clearer way to read the market."})).toBeVisible();
  await page.getByRole("button",{name:"Next"}).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button",{name:"Quick tour",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"A clearer way to read the market."})).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("skip persists, shortcuts search the 12 cryptos, chart selection persists",async({page})=>{
  await enterWorkspace(page);
  await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),TOUR_KEY))
    .toBe("dismissed");
  await page.keyboard.press("ControlOrMeta+k");
  const search=page.getByRole("combobox",{name:"Search symbols"});
  await expect(search).toBeFocused();
  await search.fill("DOT");
  await expect(page.getByRole("option",{name:/DOTUSDT/})).toBeVisible();
  await page.getByRole("option",{name:/DOTUSDT/}).click();
  await expect(page.getByRole("heading",{name:"DOTUSDT",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"5M",exact:true}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null"),PREF_KEY))
    .toEqual({symbol:"DOTUSDT",timeframe:"5m"});
  await page.reload();
  await expect(page.getByRole("heading",{name:"DOTUSDT",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"5M",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.waitForTimeout(450);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("chart focus can be entered and exited without losing analysis panel",async({page})=>{
  await enterWorkspace(page);
  await expect(page.getByRole("heading",{name:"AI DECISION BRIEF"})).toBeVisible();
  await page.getByRole("button",{name:"Enter chart focus mode"}).click();
  await expect(page.getByRole("button",{name:"Exit chart focus mode"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"AI DECISION BRIEF"})).toHaveCount(0);
  await page.getByRole("button",{name:"Exit chart focus mode"}).click();
  await expect(page.getByRole("heading",{name:"AI DECISION BRIEF"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Chart by TradingView"})).toHaveAttribute("href","https://www.tradingview.com/");
});

test("scanner uses mocked completed-candle data, context filter and verified MTF",async({page})=>{
  const seen=await mockAnalysis(page);
  await page.goto("/v2/scanner");
  await expect(page.getByRole("heading",{name:"Crypto Market Scanner"})).toBeVisible();
  await expect(page.getByText("Choose timeframe and click Scan. Scans never start automatically.")).toBeVisible();
  expect(seen).toHaveLength(0);
  await page.getByRole("button",{name:"Scan 12 Markets"}).click();
  await expect(page.getByText("12/12 checked")).toBeVisible({timeout:30_000});
  expect(seen).toHaveLength(12);
  await expect(page.getByText("Unavailable/unverified: DOTUSDT")).toBeVisible();
  await page.getByLabel("Context").selectOption("TREND_MOMENTUM");
  await expect(page.getByText("BTCUSDT",{exact:true})).toBeVisible();
  await expect(page.getByText("ETHUSDT",{exact:true})).toBeVisible();
  await expect(page.getByText("XRPUSDT",{exact:true})).toHaveCount(0);
  await page.getByLabel("Filter").selectOption("BEARISH");
  await expect(page.getByText("ETHUSDT",{exact:true})).toBeVisible();
  await expect(page.getByText("BTCUSDT",{exact:true})).toHaveCount(0);

  await page.getByLabel("Filter").selectOption("ALL");
  const btcRow=page.getByText("BTCUSDT",{exact:true})
    .locator('xpath=ancestor::div[.//button[normalize-space(.)="MTF"]][1]');
  await btcRow.getByRole("button",{name:"MTF",exact:true}).click();
  await page.getByRole("button",{name:"Check MTF (on demand)"}).click();
  await expect(page.getByText("ALIGNED BULLISH",{exact:true})).toBeVisible();
  expect(seen).toHaveLength(14);
});

test("mobile navigation and first-run tour remain usable at phone viewport",async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,
  });
  const page=await context.newPage();
  try {
    await isolate(page);
    await enterWorkspace(page);
    await expect(page.getByRole("button",{name:"Open Hidden Alpha navigation"})).toBeVisible();
    const overflow=await page.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,
      windowWidth:window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.windowWidth+3);
    await page.getByRole("button",{name:"Open Hidden Alpha navigation"}).click();
    const drawer=page.getByRole("dialog",{name:"Hidden Alpha navigation"});
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link",{name:"Market Scanner"}).click();
    await expect(page).toHaveURL(/\/v2\/scanner$/);
    await expect(page.getByRole("heading",{name:"Crypto Market Scanner"})).toBeVisible();
    await expect(page.getByRole("dialog",{name:"Hidden Alpha navigation"})).toHaveCount(0);
    await page.getByRole("button",{name:"Open navigation"}).click();
    await page.getByRole("dialog",{name:"Hidden Alpha navigation"}).getByRole("link",{name:"Dashboard"}).click();
    await expect(page).toHaveURL(/\/v2$/);
    await expect(page.getByRole("heading",{name:"Market Command Center."})).toBeVisible();
    await page.getByRole("button",{name:"Quick tour",exact:true}).click();
    await expect(page.getByRole("dialog",{name:"A clearer way to read the market."})).toBeVisible();
    await page.getByRole("button",{name:"Close onboarding"}).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {await context.close();}
});
