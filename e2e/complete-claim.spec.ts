import { expect, test } from "@playwright/test";
import { captureBrowserErrors, completeQuestionnaireToStatement, continueClaim, expectStep } from "./fixtures";

test("a fictional veteran can complete, export, save, and resume a full guided claim",async({page})=>{
  const browserErrors=captureBrowserErrors(page);
  await completeQuestionnaireToStatement(page);

  const generate=page.getByRole("button",{name:"Build guided narrative"});
  await expect(generate).toBeEnabled();
  await generate.click();
  const editor=page.getByLabel("Editable personal statement");
  await expect(editor).toHaveValue(/PERSONAL STATEMENT/);
  await expect(page.getByText(/Drafting history · 1 attempt/)).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(window.localStorage.getItem("vcc-claim-draft")||"{}").statement||"")).toContain("PERSONAL STATEMENT");
  await page.reload();
  await expectStep(page,10,"Personal statement");
  await expect(page.getByLabel("Editable personal statement")).toHaveValue(/PERSONAL STATEMENT/);

  await continueClaim(page);
  await expectStep(page,11,"Claim package");
  const confirmations=page.locator(".confirmation-list input[type=checkbox]");
  const sectionCount=await confirmations.count();
  expect(sectionCount).toBeGreaterThan(1);
  for(let index=0;index<sectionCount;index++)await confirmations.nth(index).check();
  await expect(page.getByText(new RegExp(`${sectionCount} of ${sectionCount} sections confirmed`))).toBeVisible();

  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download condition review PDF"}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toContain("migraine");
  const path=await download.path();
  expect(path).toBeTruthy();
  await expect(page.getByText(/Condition review PDF downloaded/)).toBeVisible();

  await page.getByRole("button",{name:"Save statement"}).click();
  await expect(page.getByText("Summary saved on this device")).toBeVisible();
  const stored=await page.evaluate(()=>JSON.parse(window.localStorage.getItem("vcc-claim-draft")||"{}"));
  expect(stored.answers.condition).toBe("Migraines or other headaches");
  expect(stored.statement).toContain("PERSONAL STATEMENT");
  expect(stored.confirmations).toHaveProperty("0",true);
  expect(stored.generationAudit).toHaveLength(1);

  await page.reload();
  await expectStep(page,11,"Claim package");
  await expect(page.getByText(`${sectionCount} of ${sectionCount} sections confirmed`,{exact:true})).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("starting another claim never resurrects an incomplete browser draft",async({page})=>{
  await page.goto("/claim-builder");
  await page.evaluate(()=>window.localStorage.setItem("vcc-claim-draft",JSON.stringify({
    answers:{condition:"Migraines",otherCondition:"",claimType:"Original or new claim"},
    step:3,
    furthestStep:3
  })));
  await page.goto("/claim-builder?new=1");
  await expectStep(page,1,"Condition");
  await expect(page).toHaveURL(/\/claim-builder$/);
  await expect(page.locator(".question-card select")).toHaveValue("");
  await expect(page.getByRole("heading",{name:"Tell us what you’re preparing for"})).toBeVisible();
});
