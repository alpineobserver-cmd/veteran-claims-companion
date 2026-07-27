import { expect, test } from "@playwright/test";
import { captureBrowserErrors, continueClaim, expectStep, fictionalAnswers, installDraft, savedDraft } from "./fixtures";

test("browser-only work survives offline progress, refresh, and browser navigation",async({page,context})=>{
  const browserErrors=captureBrowserErrors(page);
  await page.goto("/claim-builder?new=1");
  await page.locator(".question-card select").selectOption({label:fictionalAnswers.condition});
  await continueClaim(page);

  await context.setOffline(true);
  await page.getByLabel(/Original or new claim/).check();
  await continueClaim(page);
  await page.locator('input[name="intent-to-file"]').nth(2).check();
  await page.getByLabel(/What event, injury, illness/).fill(fictionalAnswers.serviceEvent);
  await continueClaim(page);
  await context.setOffline(false);

  await page.reload();
  await expectStep(page,4,"Health history");
  await page.getByRole("button",{name:/Step 3 of 11: Claim details/}).click();
  await expect(page.getByLabel(/What event, injury, illness/)).toHaveValue(fictionalAnswers.serviceEvent);
  await page.goto("/forms");
  await page.goBack();
  await expectStep(page,3,"Claim details");
  await expect(page.getByLabel(/What event, injury, illness/)).toHaveValue(fictionalAnswers.serviceEvent);
  expect(browserErrors.filter(error=>!error.includes("ERR_INTERNET_DISCONNECTED"))).toEqual([]);
});

test("a failed drafting request preserves answers and offers a safe retry",async({page})=>{
  await installDraft(page,savedDraft());
  await page.route("**/api/ai/personal-statement",async route=>{
    if(route.request().method()==="GET"){
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({configured:false,mode:"template",policyVersion:"disabled"})});
      return;
    }
    await route.abort("failed");
  });
  await page.goto("/claim-builder");
  await expectStep(page,10,"Personal statement");
  await page.getByRole("button",{name:"Build guided narrative"}).click();
  await expect(page.locator(".statement-message.error")).toContainText("statement could not be generated");
  await expect.poll(()=>page.evaluate(()=>JSON.parse(window.localStorage.getItem("vcc-claim-draft")||"{}").generationAudit?.length||0)).toBe(1);
  await page.reload();
  await expect(page.getByLabel("Main symptoms or limitations")).toHaveCount(0);
  const stored=await page.evaluate(()=>JSON.parse(window.localStorage.getItem("vcc-claim-draft")||"{}"));
  expect(stored.answers.symptoms).toBe(fictionalAnswers.symptoms);
  expect(stored.generationAudit.at(-1).resultStatus).toBe("failed");
});

test("rapid repeated generation produces only one active request",async({page})=>{
  await installDraft(page,savedDraft());
  let requests=0;
  await page.route("**/api/ai/personal-statement",async route=>{
    if(route.request().method()==="GET"){
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({configured:false,mode:"template",policyVersion:"disabled"})});
      return;
    }
    requests+=1;
    await new Promise(resolve=>setTimeout(resolve,1_500));
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
      status:"ready",
      statement:"PERSONAL STATEMENT — MIGRAINES\n\nThis is a fictional generated statement.",
      mode:"template",
      notice:"",
      generation:{
        id:"fictional-browser-generation",
        feature:"personal_statement",
        mode:"template",
        model:"guided-template",
        policyVersion:"disabled",
        sourceReferences:["answer:condition"],
        createdAt:"2026-07-24T10:00:00.000Z",
        completedAt:"2026-07-24T10:00:01.000Z",
        resultStatus:"ready"
      }
    })});
  });
  await page.goto("/claim-builder");
  const button=page.getByRole("button",{name:"Build guided narrative"});
  await button.click();
  await expect(page.locator(".generate-statement")).toBeDisabled();
  await page.locator(".generate-statement").click({force:true});
  await page.waitForTimeout(1_700);
  expect(requests).toBe(1);
  await expect(page.getByLabel("Editable personal statement")).toBeVisible();
});
