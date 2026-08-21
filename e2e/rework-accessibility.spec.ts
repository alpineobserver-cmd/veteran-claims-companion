import AxeBuilder from "@axe-core/playwright";
import {expect,test,type Page} from "@playwright/test";

const previewPath="/rework-preview?fictionalTester=1";
const storageKey="debrief.rework-preview.v3";

async function expectNoSeriousAxeViolations(page:Page,label:string){
  const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
  const violations=results.violations.filter(item=>item.impact==="critical"||item.impact==="serious");
  expect(violations,`${label}: ${violations.map(item=>`${item.id}: ${item.help} (${item.nodes.length})`).join("; ")}`).toEqual([]);
}

async function beginPackage(page:Page){
  await page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."}).getByRole("button",{name:"Choose package type"}).click();
  await page.getByRole("radio",{name:/New disability claim/}).check();
  await page.getByRole("button",{name:"Continue to Service & Health"}).click();
}

async function addFoundation(page:Page){
  await page.getByRole("button",{name:"Add service period"}).first().click();
  let dialog=page.getByRole("dialog",{name:"Add a service period"});
  await dialog.getByLabel("Branch and service component").selectOption("Air Force");
  await dialog.getByLabel("Period type").selectOption("Duty station");
  await dialog.getByLabel("Location or unit").fill("Fictional duty station");
  await dialog.getByLabel("Role, MOS, rate, or duty").fill("Aircraft maintenance");
  await dialog.getByRole("button",{name:"Save item"}).click();
  await page.getByRole("button",{name:"Add health event"}).first().click();
  dialog=page.getByRole("dialog",{name:"Add a health event"});
  await dialog.getByLabel("Event type").selectOption("Injury");
  await dialog.getByLabel("Condition, symptom, or event").fill("Right knee injury");
  await dialog.getByLabel("What happened").fill("Pain after a fictional training exercise.");
  await dialog.getByRole("button",{name:"Save item"}).click();
}

test.beforeEach(async({page})=>{
  await page.goto(previewPath);
  await page.evaluate(key=>localStorage.removeItem(key),storageKey);
  await page.reload();
});

test("core rework journey has no serious or critical axe violations",async({page})=>{
  await expectNoSeriousAxeViolations(page,"mission briefing");
  await page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."}).getByRole("button",{name:"Choose package type"}).click();
  await expectNoSeriousAxeViolations(page,"package type");
  await page.getByRole("radio",{name:/New disability claim/}).check();
  await page.getByRole("button",{name:"Continue to Service & Health"}).click();
  await expectNoSeriousAxeViolations(page,"service and health intake");
  await addFoundation(page);
  await page.getByRole("button",{name:"Continue to documents"}).click();
  await expectNoSeriousAxeViolations(page,"document library");
  await page.getByRole("button",{name:"Go to Package Overview"}).click();
  await expectNoSeriousAxeViolations(page,"package overview");
  await page.getByRole("button",{name:/Claim Leads/}).click();
  await expectNoSeriousAxeViolations(page,"claim leads");
  await page.locator(".rw-lead").filter({hasText:"Right knee symptoms"}).getByRole("button",{name:"Add to Your Claims"}).click();
  await page.getByRole("tab",{name:/Accepted/}).click();
  await page.locator(".rw-lead").filter({hasText:"Right knee symptoms"}).getByRole("button",{name:"Open Claim"}).click();
  await expectNoSeriousAxeViolations(page,"claim workspace");
  await page.getByRole("button",{name:"Check package readiness"}).click();
  await expectNoSeriousAxeViolations(page,"package review");
});

test("mobile briefing, intake, and overview have no serious or critical axe violations",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await expectNoSeriousAxeViolations(page,"mobile mission briefing");
  await beginPackage(page);
  await expectNoSeriousAxeViolations(page,"mobile intake");
  await page.getByRole("button",{name:"Continue to documents"}).click();
  await page.getByRole("button",{name:"Go to Package Overview"}).click();
  await expectNoSeriousAxeViolations(page,"mobile package overview");
});
