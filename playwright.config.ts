import { defineConfig, devices } from "@playwright/test";

const port=3111;
const baseURL=`http://localhost:${port}`;

export default defineConfig({
  testDir:"./e2e",
  fullyParallel:false,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI?1:0,
  workers:1,
  reporter:process.env.CI?"github":"list",
  timeout:45_000,
  expect:{timeout:8_000,toHaveScreenshot:{animations:"disabled",maxDiffPixelRatio:0.01}},
  use:{
    baseURL,
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    video:"retain-on-failure",
    locale:"en-US",
    timezoneId:"UTC",
    colorScheme:"light"
  },
  webServer:{
    command:`npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url:baseURL,
    reuseExistingServer:!process.env.CI,
    timeout:120_000,
    env:{
      APP_ENV:"development",
      DATA_ENVIRONMENT:"development",
      RELEASE_ID:"browser-test",
      AUTH_URL:baseURL,
      AUTH_CANONICAL_HOST:"localhost",
      DEBRIEF_AI_GENERATION_ENABLED:"false",
      DEBRIEF_UPLOADS_ENABLED:"false",
      NEXT_TELEMETRY_DISABLED:"1"
    }
  },
  projects:[{
    name:"chromium",
    use:{...devices["Desktop Chrome"],viewport:{width:1280,height:900}}
  }]
});
