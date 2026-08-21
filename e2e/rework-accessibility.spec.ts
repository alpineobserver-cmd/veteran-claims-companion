import AxeBuilder from "@axe-core/playwright";
import {expect,test,type Page} from "@playwright/test";

const previewPath="/rework-preview?fictionalTester=1";
const storageKey="debrief.rework-preview.v3";

async function expectNoSeriousAxeViolations(page:Page,label:string){
  const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
  const violations=results.violations.filter(item=>item.impact==="critical"||item.impact==="serious");
  expect(violations,`${label}: ${violations.map(item=>`${item.id}: ${item.help} (${item.nodes.length})`).join("; ")}`).toEqual([]);
}

async function expectActionsInsideViewport(page:Page,label:string){
  const issues=await page.evaluate(()=>Array.from(document.querySelectorAll<HTMLElement>("button,a[href]")).flatMap(element=>{
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    const onScreen=style.display!=="none"&&style.visibility!=="hidden"&&rect.width>1&&rect.height>1&&rect.right>0&&rect.left<innerWidth&&rect.bottom>0&&rect.top<innerHeight;
    if(!onScreen||element.classList.contains("sr-only"))return [];
    const clipped=rect.left<-.5||rect.right>innerWidth+.5||element.scrollWidth>element.clientWidth+1||element.scrollHeight>element.clientHeight+2;
    return clipped?[`${element.tagName.toLowerCase()} "${element.innerText.trim()}" at ${Math.round(rect.left)}-${Math.round(rect.right)}px (${element.clientWidth}x${element.clientHeight}, scroll ${element.scrollWidth}x${element.scrollHeight})`]:[];
  }));
  expect(issues,`${label}: ${issues.join("; ")}`).toEqual([]);
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
  await expectActionsInsideViewport(page,"mission briefing");
  await page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."}).getByRole("button",{name:"Choose package type"}).click();
  await expectNoSeriousAxeViolations(page,"package type");
  await expectActionsInsideViewport(page,"package type");
  await page.getByRole("radio",{name:/New disability claim/}).check();
  await page.getByRole("button",{name:"Continue to Service & Health"}).click();
  await expectNoSeriousAxeViolations(page,"service and health intake");
  await expectActionsInsideViewport(page,"service and health intake");
  await addFoundation(page);
  await page.getByRole("button",{name:"Continue to documents"}).click();
  await expectNoSeriousAxeViolations(page,"document library");
  await expectActionsInsideViewport(page,"document library");
  await page.getByRole("button",{name:"Go to Package Overview"}).click();
  await expectNoSeriousAxeViolations(page,"package overview");
  await expectActionsInsideViewport(page,"package overview");
  await page.getByRole("button",{name:/Claim Leads/}).click();
  await expectNoSeriousAxeViolations(page,"claim leads");
  await expectActionsInsideViewport(page,"claim leads");
  await page.locator(".rw-lead").filter({hasText:"Right knee symptoms"}).getByRole("button",{name:"Add to Your Claims"}).click();
  await page.getByRole("tab",{name:/Accepted/}).click();
  await page.locator(".rw-lead").filter({hasText:"Right knee symptoms"}).getByRole("button",{name:"Open Claim"}).click();
  await expectNoSeriousAxeViolations(page,"claim workspace");
  await expectActionsInsideViewport(page,"claim workspace");
  await page.getByRole("button",{name:"Check package readiness"}).click();
  await expectNoSeriousAxeViolations(page,"package review");
  await expectActionsInsideViewport(page,"package review");
});

test("mobile briefing, intake, and overview have no serious or critical axe violations",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await expectNoSeriousAxeViolations(page,"mobile mission briefing");
  await expectActionsInsideViewport(page,"mobile mission briefing");
  await beginPackage(page);
  await expectNoSeriousAxeViolations(page,"mobile intake");
  await expectActionsInsideViewport(page,"mobile intake");
  await page.getByRole("button",{name:"Continue to documents"}).click();
  await page.getByRole("button",{name:"Go to Package Overview"}).click();
  await expectNoSeriousAxeViolations(page,"mobile package overview");
  await expectActionsInsideViewport(page,"mobile package overview");
});

test("reference annotations stay available to assistive technology without disrupting navigation",async({page})=>{
  await page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."}).getByRole("button",{name:"Choose package type"}).click();
  const annotations=page.locator(".rw-utility-nav .sr-only");
  await expect(annotations).toHaveCount(5);
  for(let index=0;index<await annotations.count();index++){
    const annotation=annotations.nth(index);
    await expect(annotation).toHaveCSS("position","absolute");
    await expect(annotation).toHaveCSS("width","1px");
    await expect(annotation).toHaveCSS("height","1px");
    await expect(annotation).toHaveCSS("overflow","hidden");
    await expect(annotation).toHaveCSS("clip","rect(0px, 0px, 0px, 0px)");
  }
  await expect(page.getByRole("link",{name:/Exposure Checker.*opens in a new tab/i})).toHaveCount(1);
  await expectActionsInsideViewport(page,"desktop package type");

  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Open navigation"}).click();
  await page.waitForFunction(()=>{
    const sidebar=document.querySelector<HTMLElement>(".rw-shell > aside");
    return sidebar!==null&&sidebar.getBoundingClientRect().left>=-.5;
  });
  await expectActionsInsideViewport(page,"mobile navigation");
  const layout=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
});
