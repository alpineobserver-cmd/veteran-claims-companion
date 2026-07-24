import { expect, test } from "@playwright/test";
import { captureBrowserErrors, fictionalAnswers, installDraft, largeWorkspaceSet, savedDraft } from "./fixtures";

async function expectNoHorizontalOverflow(page:import("@playwright/test").Page){
  const overflow=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    body:document.body.scrollWidth-document.body.clientWidth
  }));
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

test("ten large fictional workspaces remain usable at mobile, tablet, and desktop widths",async({page})=>{
  const browserErrors=captureBrowserErrors(page);
  const workspaces=largeWorkspaceSet();
  await installDraft(page,savedDraft({step:9,furthestStep:10}),workspaces);
  await page.goto("/claim-builder");

  const switcher=page.getByLabel("Other condition workspaces");
  await expect(switcher.locator("option")).toHaveCount(11);
  await switcher.selectOption("9");
  await expect(page.getByRole("heading",{name:/Fictional bilateral musculoskeletal condition/})).toBeVisible();

  for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:1000}]){
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    await expect(page.locator(".question-card")).toBeVisible();
    await expect(page.locator(".save-button")).toBeVisible();
  }
  expect(browserErrors).toEqual([]);
});

test("@visual landing page desktop baseline",async({page})=>{
  test.skip(Boolean(process.env.CI),"Pixel baselines are platform-specific; CI runs the structural browser suite.");
  await page.goto("/");
  await expect(page).toHaveScreenshot("landing-desktop.png",{fullPage:true});
});

test("@visual claim builder mobile baseline",async({page})=>{
  test.skip(Boolean(process.env.CI),"Pixel baselines are platform-specific; CI runs the structural browser suite.");
  await page.setViewportSize({width:390,height:844});
  await page.goto("/claim-builder?new=1");
  await expect(page).toHaveScreenshot("claim-builder-mobile.png",{fullPage:true});
});

test("@visual large statement workspace baseline",async({page})=>{
  test.skip(Boolean(process.env.CI),"Pixel baselines are platform-specific; CI runs the structural browser suite.");
  const large=largeWorkspaceSet()[9];
  await installDraft(page,{
    ...large,
    answers:{...fictionalAnswers,...large.answers}
  },largeWorkspaceSet());
  await page.goto("/claim-builder");
  await expect(page.getByText(/Drafting history · 50 attempts/)).toBeVisible();
  await expect(page).toHaveScreenshot("large-statement-workspace.png",{fullPage:true});
});
