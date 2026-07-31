import {expect,test} from "@playwright/test";
import {captureBrowserErrors} from "./fixtures";

async function expectNoOverflow(page:import("@playwright/test").Page){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function acceptKneeLead(page:import("@playwright/test").Page){
  await page.getByRole("button",{name:/Claim leads/}).click();
  await page.locator(".rw-lead").filter({hasText:"Right knee symptoms"}).getByRole("button",{name:/Create claim workspace/}).click();
}

test.beforeEach(async({page})=>{
  await page.goto("/rework-preview");
  await page.evaluate(()=>localStorage.removeItem("debrief.rework-preview.v1"));
  await page.reload();
});

test("guided rework preview completes from briefing to linked follow-up",async({page})=>{
  const errors=captureBrowserErrors(page);
  await expect(page.getByRole("heading",{name:"Bring the mission details together. Build from what you know."})).toBeVisible();
  await expect(page.getByRole("link",{name:"Sign in"})).toHaveAttribute("href","/login?redirectTo=/rework-preview");
  const journey=page.getByRole("complementary",{name:"Case journey navigation"});
  await expect(journey.getByRole("link",{name:"Exposure Checker"})).toHaveAttribute("href","/exposure-record-check");
  await expect(journey.getByRole("link",{name:"Conditions library"})).toHaveAttribute("href","/conditions");
  await expect(journey.getByRole("link",{name:"Help & guide"})).toHaveAttribute("href","/support");
  await expect(journey.getByRole("link",{name:"Send feedback"})).toHaveAttribute("href","/support#content-correction");

  const briefing=page.getByRole("dialog",{name:"A well-supported original claim connects three things."});
  await expect(briefing).toBeVisible();
  await expect(briefing.getByRole("heading",{name:"A well-supported original claim connects three things."})).toBeFocused();
  await expect(briefing.getByText("How they may be related")).toBeVisible();
  await expect(briefing.getByRole("checkbox",{name:"Do not show this briefing again"})).not.toBeChecked();
  await briefing.getByRole("checkbox",{name:"Do not show this briefing again"}).check();
  await briefing.getByRole("button",{name:/Begin your debrief/}).click();

  await expect(page.getByRole("heading",{name:"Start with what only you know."})).toBeVisible();
  await page.getByRole("button",{name:"Add health event"}).click();
  const addEvent=page.getByRole("dialog",{name:"Add a health event"});
  await addEvent.getByLabel("Injury, illness, surgery, or treatment").fill("Fictional ankle injury");
  await addEvent.getByLabel("What happened").fill("Fictional training event.");
  await addEvent.getByRole("textbox",{name:"Date",exact:true}).fill("Spring 2016");
  await expect(addEvent.getByLabel("These dates are approximate")).toBeChecked();
  await addEvent.getByRole("button",{name:"Save item"}).click();
  await expect(page.getByText("Fictional ankle injury")).toBeVisible();
  await page.getByRole("button",{name:/Continue to documents/}).click();

  await expect(page.getByRole("heading",{name:"Turn records into findable facts."})).toBeVisible();
  await page.getByRole("button",{name:"Retry analysis"}).click();
  await expect(page.getByText("Analysis retry started.")).toBeVisible();
  await page.getByRole("button",{name:"Review claim leads"}).click();

  await expect(page.getByRole("heading",{name:"Connect patterns without losing the source."})).toBeVisible();
  await page.locator(".rw-lead").filter({hasText:"Right knee symptoms"}).getByRole("button",{name:/Create claim workspace/}).click();
  await expect(page.getByText("Right knee symptoms added as a claim workspace.")).toBeVisible();
  await page.getByRole("button",{name:"Open case dashboard"}).click();
  await expect(page.getByRole("heading",{name:"Your debrief, organized into action."})).toBeVisible();
  await page.getByRole("button",{name:/Open workspace/}).click();

  await expect(page.getByRole("heading",{name:"Build the statement from facts you can trace."})).toBeVisible();
  await page.getByRole("button",{name:/Service treatment record Page 18/}).click();
  const source=page.getByRole("dialog",{name:"Service treatment record"});
  await expect(source.getByText("Follow-up for right knee pain after field exercise.")).toBeVisible();
  await source.getByRole("button",{name:"Confirm source"}).click();
  await page.getByRole("button",{name:"Mark statement reviewed"}).click();
  await page.getByRole("button",{name:"Check package readiness"}).click();

  await expect(page.getByRole("heading",{name:"Required reviews complete"})).toBeVisible();
  await page.getByRole("radio",{name:"Not for this package"}).check();
  await page.getByRole("tab",{name:/Final approval/}).click();
  await page.getByRole("button",{name:"Approve entire package"}).click();
  await expect(page.getByText("Download here. Submit through an official VA channel.")).toBeVisible();
  await page.getByRole("button",{name:"Preview download package"}).click();
  const download=page.getByRole("dialog",{name:"Your package is ready to download"});
  await expect(download.getByText("debrief-case-package.zip")).toBeVisible();
  await download.getByRole("button",{name:"Preview follow-up"}).click();
  await expect(page.getByRole("dialog",{name:"Start new work without changing the prior package."}).getByText("Supplemental claim")).toBeVisible();

  await page.getByRole("button",{name:"Return to package"}).click();
  await page.reload();
  await expect(page.getByRole("heading",{name:"Turn verified information into a reviewable package."})).toBeVisible();
  await expect(briefing).toBeHidden();
  expect(errors).toEqual([]);
});

test("lead controls preserve user choice without blocking uncertain topics",async({page})=>{
  await page.getByRole("dialog").getByRole("button",{name:"View orientation"}).click();
  await page.getByRole("button",{name:/Claim leads/}).click();

  const lowLead=page.locator(".rw-lead").filter({hasText:"Lower-back symptoms"});
  await expect(lowLead.getByText("Limited information")).toBeVisible();
  await lowLead.getByRole("button",{name:/Create claim workspace/}).click();
  await expect(page.getByText("Lower-back symptoms added as a claim workspace.")).toBeVisible();
  await lowLead.getByRole("button",{name:"Dismiss"}).click();
  await page.getByRole("button",{name:/Dismissed/}).click();
  await page.getByRole("button",{name:"Restore lead"}).click();
  await expect(page.getByText("Lead restored.")).toBeVisible();

  await page.getByRole("button",{name:"Add a claim not shown"}).click();
  await page.getByRole("dialog").getByLabel("Condition or symptom").fill("Fictional shoulder symptoms");
  await page.getByRole("button",{name:"Save item"}).click();
  await page.getByRole("button",{name:/Case dashboard/}).click();
  await expect(page.getByText("Fictional shoulder symptoms")).toBeVisible();
});

test("package approval is blocked and editing a reviewed statement clears readiness",async({page})=>{
  await page.getByRole("dialog").getByRole("button",{name:"View orientation"}).click();
  await acceptKneeLead(page);
  await page.getByRole("button",{name:/Package review/}).click();
  await page.getByRole("tab",{name:/Final approval/}).click();
  await expect(page.getByText("Approval is blocked.")).toBeVisible();
  await expect(page.getByRole("button",{name:"Approve entire package"})).toBeDisabled();

  await page.getByRole("tab",{name:/Package readiness/}).click();
  await page.getByRole("button",{name:"Review statement"}).click();
  await page.getByRole("button",{name:"Mark statement reviewed"}).click();
  await page.getByRole("button",{name:/Service treatment record Page 18/}).click();
  await page.getByRole("dialog",{name:"Service treatment record"}).getByRole("button",{name:"Confirm source"}).click();
  await page.getByRole("button",{name:"Check package readiness"}).click();
  await expect(page.getByRole("heading",{name:"Required reviews complete"})).toBeVisible();

  await page.getByRole("button",{name:"Review again"}).first().click();
  await page.getByRole("textbox",{name:/Current symptoms/}).fill("Edited fictional symptoms.");
  await page.getByRole("button",{name:"Check package readiness"}).click();
  await expect(page.getByRole("heading",{name:"1 remaining"})).toBeVisible();
});

test("preview remains usable at mobile and desktop widths",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await expectNoOverflow(page);
  const mobileBriefing=page.getByRole("dialog",{name:"A well-supported original claim connects three things."});
  await expect(mobileBriefing.getByRole("button",{name:"Begin your debrief"})).toBeVisible();
  expect(await mobileBriefing.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  await mobileBriefing.getByRole("button",{name:"View orientation"}).click();
  for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
    await page.setViewportSize(viewport);
    await expectNoOverflow(page);
    await expect(page.getByRole("heading",{name:"Bring the mission details together. Build from what you know."})).toBeVisible();
    if(viewport.width===390){
      await page.getByRole("button",{name:"Open navigation"}).click();
      const journey=page.getByRole("complementary",{name:"Case journey navigation"});
      await expect(journey).toHaveClass(/open/);
      await expect(journey.getByRole("button",{name:/Claim workspace/})).toBeVisible();
      await expect(journey.getByRole("link",{name:"Forms guide"})).toBeVisible();
      await journey.getByRole("button",{name:"Close navigation"}).click();
    }
  }
});

test("direct navigation records visited screens and keeps empty states honest",async({page})=>{
  await page.getByRole("dialog").getByRole("button",{name:"View orientation"}).click();
  const journey=page.getByRole("complementary",{name:"Case journey navigation"});
  await journey.getByRole("button",{name:/Claim workspace/}).click();
  await expect(page.getByRole("heading",{name:"Create a claim workspace first."})).toBeVisible();
  await journey.getByRole("button",{name:/Package review/}).click();
  await expect(page.getByRole("heading",{name:"Build a claim workspace before package review."})).toBeVisible();
  await expect(page.getByRole("tab",{name:/Package readiness/})).toBeHidden();
  await expect(journey.getByRole("button",{name:/Service & health/})).toContainText("Available anytime");
  await page.getByRole("button",{name:/Review claim leads/}).click();
  await expect(page.getByRole("heading",{name:"Connect patterns without losing the source."})).toBeVisible();
});

test("intake entries can be edited and document search explains empty results",async({page})=>{
  await page.getByRole("dialog").getByRole("button",{name:/Begin your debrief/}).click();
  await page.getByRole("button",{name:"Edit Right knee injury during unit training"}).click();
  const editor=page.getByRole("dialog",{name:"Edit health event"});
  await expect(editor.getByLabel("Injury, illness, surgery, or treatment")).toHaveValue("Right knee injury during unit training");
  await editor.getByLabel("Injury, illness, surgery, or treatment").fill("Updated fictional knee event");
  await editor.getByRole("button",{name:"Save item"}).click();
  await expect(page.getByText("Updated fictional knee event")).toBeVisible();
  await page.getByRole("button",{name:/My Documents/}).click();
  await page.getByLabel("Search documents").fill("not-a-document");
  await expect(page.getByRole("heading",{name:"No matching documents"})).toBeVisible();
});

test("mission briefing traps focus, saves preference, and returns to the active case",async({page})=>{
  const briefing=page.getByRole("dialog",{name:"A well-supported original claim connects three things."});
  await expect(briefing.getByRole("heading",{name:"A well-supported original claim connects three things."})).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(briefing.getByRole("button",{name:/Begin your debrief/})).toBeFocused();

  await briefing.getByRole("button",{name:"View orientation"}).click();
  await page.reload();
  await expect(briefing).toBeVisible();
  await briefing.getByRole("checkbox",{name:"Do not show this briefing again"}).check();
  await briefing.getByRole("button",{name:"View orientation"}).click();
  await page.getByRole("button",{name:/Package review/}).click();
  await page.getByRole("button",{name:"How Debrief works"}).click();
  await expect(briefing.getByRole("button",{name:/Return to case/})).toBeVisible();
  await expect(briefing.getByRole("button",{name:/Begin your debrief/})).toBeHidden();
  await briefing.getByRole("button",{name:/Return to case/}).click();
  await expect(page.getByRole("heading",{name:"Build a claim workspace before package review."})).toBeVisible();
});
