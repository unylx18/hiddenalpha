import {defineConfig} from "@playwright/test";
import {fileURLToPath} from "node:url";

const port=39322;
const baseURL="http://127.0.0.1:"+port;

export default defineConfig({
  testDir:".",
  testMatch:"**/*.spec.mjs",
  fullyParallel:false,
  forbidOnly:Boolean(process.env.CI),
  retries:0,
  workers:1,
  timeout:30_000,
  expect:{timeout:8_000},
  reporter:[["line"]],
  outputDir:"../../test-results/hiddenalpha-v2",
  use:{
    baseURL,
    browserName:"chromium",
    viewport:{width:1440,height:900},
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
  },
  webServer:{
    cwd:fileURLToPath(new URL("../../",import.meta.url)),
    command:"node node_modules/next/dist/bin/next start -p "+port+" -H 127.0.0.1",
    url:baseURL+"/v2",
    reuseExistingServer:!process.env.CI,
    timeout:60_000,
    env:{NEXT_TELEMETRY_DISABLED:"1"},
  },
});
