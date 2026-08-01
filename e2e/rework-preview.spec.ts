import {expect,test} from "@playwright/test";
import {captureBrowserErrors} from "./fixtures";

const previewPath="/rework-preview?fictionalTester=1";

async function expectNoOverflow(page:import("@playwright/test").Page){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function startCleanIntake(page:import("@playwright/test").Page){
  const briefing=page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."});
  await briefing.getByRole("button",{name:"Choose package type"}).click();
  await page.getByRole("radio",{name:/New disability claim/}).check();
  await page.getByRole("button",{name:"Continue to Service & Health"}).click();
}

async function addKneeIntake(page:import("@playwright/test").Page){
  await page.getByRole("button",{name:"Add service period"}).first().click();
  const service=page.getByRole("dialog",{name:"Add a service period"});
  await service.getByLabel("Branch and service component").selectOption("Air Force");
  await service.getByLabel("Period type").selectOption("Duty station");
  await service.getByLabel("Location or unit").fill("Fictional duty station");
  await service.getByLabel("Role, MOS, rate, or duty").fill("Aircraft maintenance");
  await service.getByLabel("Duties, conditions, or exposures to remember").fill("Flight-line noise and equipment lifting");
  await service.getByLabel("Start date").fill("2011-01-01");
  await service.getByLabel("End date").fill("2015-01-01");
  await service.getByRole("button",{name:"Save item"}).click();

  await page.getByRole("button",{name:"Add health event"}).first().click();
  const event=page.getByRole("dialog",{name:"Add a health event"});
  await event.getByLabel("Event type: injury, illness, surgery, treatment, or symptom change").fill("Injury");
  await event.getByLabel("Condition, symptom, or event").fill("Right knee injury");
  await event.getByLabel("What happened").fill("Pain after a fictional training exercise.");
  await event.getByRole("textbox",{name:"Date",exact:true}).fill("2013");
  await event.getByRole("button",{name:"Save item"}).click();
}

async function completeSetup(page:import("@playwright/test").Page,{upload=false}:{upload?:boolean}={}){
  await page.getByRole("button",{name:"Continue to documents"}).click();
  if(upload){
    await page.getByRole("button",{name:"Simulate upload"}).click();
    await expect(page.getByText("Fictional document added. Analysis is being simulated.")).toBeVisible();
  }
  await page.getByRole("button",{name:"Finish setup"}).click();
}

async function addOtherClaim(page:import("@playwright/test").Page,title:string){
  await page.getByRole("button",{name:"Add a claim not shown"}).click();
  const dialog=page.getByRole("dialog",{name:"Add a claim to your package"});
  await dialog.getByLabel("Condition or symptom").selectOption("Other / condition not listed");
  await dialog.getByLabel("Condition or symptom name").fill(title);
  await dialog.getByRole("button",{name:"Add Claim"}).click();
}

test.beforeEach(async({page})=>{
  await page.goto(previewPath);
  await page.evaluate(()=>localStorage.removeItem("debrief.rework-preview.v2"));
  await page.reload();
});

test("public landing requires an account and uses Debrief mission language",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Debrief your service. Organize the facts that matter."})).toBeVisible();
  await expect(page.getByText("Veteran claim preparation",{exact:true})).toHaveCount(1);
  await expect(page.getByRole("link",{name:/Continue without an account/i})).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard|\/login\?redirectTo=\/dashboard/);
});

test("signed-out visitors are redirected to authentication",async({page})=>{
  await page.goto("/rework-preview");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Frework-preview|\/login\?redirectTo=\/rework-preview/);
  await expect(page.getByRole("heading",{name:"Sign in to continue your debrief."})).toBeVisible();
  await expect(page.getByText("Your account keeps your service history, records, and claim package connected to you.")).toBeVisible();
});

test("related claim tools also require authentication",async({page})=>{
  for(const path of ["/conditions","/forms","/exposure-record-check","/claim-builder"]){
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
    await expect(page.getByRole("heading",{name:"Sign in to continue your debrief."})).toBeVisible();
  }
});

test("new profile starts empty and orientation is not permanent navigation",async({page})=>{
  const errors=captureBrowserErrors(page);
  const journey=page.getByRole("complementary",{name:"Claim package navigation"});
  await expect(journey.getByRole("button",{name:/Orientation/})).toHaveCount(0);
  await expect(journey.getByRole("link",{name:"Debrief home"})).toHaveAttribute("href","/");
  await expect(journey.getByRole("button",{name:/Service & Health/})).toBeVisible();
  await expect(journey.getByRole("button",{name:/My Documents/})).toBeVisible();
  await expect(journey.getByRole("button",{name:/Package Overview/})).toHaveCount(0);
  await expect(journey.getByText("Completed or visited")).toHaveCount(0);
  await expect(journey.getByText("Available",{exact:true})).toHaveCount(0);

  await startCleanIntake(page);
  await expect(page.getByText("No service history yet")).toBeVisible();
  await expect(page.getByText("No health events yet")).toBeVisible();
  await expect(page.getByText("Naval Air Station Lemoore")).toHaveCount(0);
  await expect(page.getByText("Community clinic summary.pdf")).toHaveCount(0);

  await addKneeIntake(page);
  await completeSetup(page);
  await expect(page.getByRole("heading",{name:"Your claim package, organized into action."})).toBeVisible();
  await expect(journey.getByRole("button",{name:/Package Overview/})).toBeVisible();
  await expect(journey.getByRole("button",{name:/Orientation/})).toHaveCount(0);
  await expect(journey.getByText("Package and Foundation")).toBeVisible();
  await expect(journey.getByText("Claims in This Package")).toBeVisible();
  await expect(journey.getByText("Finalize")).toBeVisible();
  await expect(page.getByText("No records added yet")).toBeVisible();
  expect(errors).toEqual([]);
});

test("returning users land on package overview instead of onboarding",async({page})=>{
  await startCleanIntake(page);
  await addKneeIntake(page);
  await completeSetup(page);
  await page.getByRole("button",{name:/Service & Health/}).click();
  await expect(page.getByRole("heading",{name:"Start with what only you know."})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading",{name:"Your claim package, organized into action."})).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("clean-profile journey reaches a reviewed package",async({page})=>{
  await startCleanIntake(page);
  await addKneeIntake(page);
  await completeSetup(page,{upload:true});
  await page.getByRole("button",{name:/Claim Leads/}).click();
  const kneeLead=page.locator(".rw-lead").filter({hasText:"Right knee symptoms"});
  await kneeLead.getByRole("button",{name:"Add to Your Claims"}).click();
  await page.getByRole("button",{name:"Open Package Overview"}).click();
  const journey=page.getByRole("complementary",{name:"Claim package navigation"});
  await expect(journey.getByRole("button",{name:"Right knee symptoms"})).toBeVisible();
  await expect(journey.getByRole("button",{name:/Claim Workspace/})).toHaveCount(0);
  await page.getByRole("button",{name:"Resolve Claim Review"}).click();
  await expect(page.getByRole("heading",{name:"Right knee symptoms Claim"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Package Overview \/ Right knee symptoms/})).toBeVisible();

  await page.getByRole("button",{name:/Health timeline/}).click();
  await page.getByRole("dialog",{name:"Health timeline"}).getByRole("button",{name:"Confirm source"}).click();
  await page.getByRole("textbox",{name:/In-service event/}).fill("Right knee pain began after a fictional training exercise in 2013.");
  await page.getByRole("textbox",{name:/Current symptoms/}).fill("Intermittent pain when using stairs and standing.");
  await page.getByRole("textbox",{name:/Possible relationship to service/}).fill("Symptoms began after the training event and continued afterward.");
  await page.getByRole("textbox",{name:/Daily impact/}).fill("Pain limits stairs, kneeling, and prolonged standing.");
  await page.getByRole("button",{name:"Mark statement reviewed"}).click();
  await page.getByRole("button",{name:"Check package readiness"}).click();
  await expect(page.getByRole("heading",{name:"Required reviews complete"})).toBeVisible();
  await page.getByRole("radio",{name:"Not for this package"}).check();
  await page.getByRole("tab",{name:/Final approval/}).click();
  await page.getByRole("button",{name:"Approve entire package"}).click();
  await page.getByRole("button",{name:"Preview download package"}).click();
  await expect(page.getByRole("dialog",{name:"Your package is ready to download"})).toBeVisible();
});

test("a claim can be safely deleted from Package Overview",async({page})=>{
  await startCleanIntake(page);
  await addKneeIntake(page);
  await completeSetup(page);
  await page.getByRole("button",{name:/Claim Leads/}).click();
  const kneeLead=page.locator(".rw-lead").filter({hasText:"Right knee symptoms"});
  await kneeLead.getByRole("button",{name:"Add to Your Claims"}).click();
  await page.getByRole("button",{name:"Open Package Overview"}).click();

  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Delete Right knee symptoms"}).click();
  let confirmation=page.getByRole("dialog",{name:"Delete Right knee symptoms?"});
  await expect(confirmation).toContainText("Documents and service history saved to your account will remain available.");
  await expectNoOverflow(page);
  await confirmation.getByRole("button",{name:"Keep claim"}).click();
  await expect(page.getByText("1 active claim")).toBeVisible();

  await page.getByRole("button",{name:"Delete Right knee symptoms"}).click();
  confirmation=page.getByRole("dialog",{name:"Delete Right knee symptoms?"});
  await confirmation.getByRole("button",{name:"Delete claim"}).click();
  await expect(page.getByText("No claims yet")).toBeVisible();
  await expect(page.locator(".rw-notice")).toContainText("Claim “Right knee symptoms” was removed from this package.");

  await page.setViewportSize({width:1280,height:900});
  const journey=page.getByRole("complementary",{name:"Claim package navigation"});
  await expect(journey.getByRole("button",{name:"Right knee symptoms"})).toHaveCount(0);
  await journey.getByRole("button",{name:/Claim Leads/}).click();
  await expect(kneeLead.getByRole("button",{name:"Add to Your Claims"})).toBeEnabled();
});

test("documents can be skipped and users can add their own claim",async({page})=>{
  await startCleanIntake(page);
  await completeSetup(page);
  await page.getByRole("button",{name:/Claim Leads/}).click();
  await expect(page.getByText("No claim leads yet")).toBeVisible();
  await page.getByRole("button",{name:"Add a claim not shown"}).click();
  const custom=page.getByRole("dialog",{name:"Add a claim to your package"});
  await custom.getByLabel("Condition or symptom").selectOption("Shoulder or arm condition");
  await custom.getByRole("button",{name:"Add Claim"}).click();
  await page.getByRole("button",{name:"Package Overview",exact:true}).click();
  await expect(page.locator("#rework-main").getByText("Shoulder or arm condition",{exact:true})).toBeVisible();
});

test("an unlisted claim accepts free text and prevents a duplicate",async({page})=>{
  await startCleanIntake(page);
  await completeSetup(page);
  await page.getByRole("button",{name:/Claim Leads/}).click();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Add a claim not shown"}).click();
  let custom=page.getByRole("dialog",{name:"Add a claim to your package"});
  await expectNoOverflow(page);
  await custom.getByLabel("Condition or symptom").selectOption("Other / condition not listed");
  await expect(custom.getByLabel("Condition or symptom name")).toBeVisible();
  await expect(custom.getByRole("button",{name:"Add Claim"})).toBeDisabled();
  await custom.getByLabel("Condition or symptom name").fill("Fictional shoulder symptoms");
  await custom.getByRole("button",{name:"Add Claim"}).click();

  await page.getByRole("button",{name:"Add a claim not shown"}).click();
  custom=page.getByRole("dialog",{name:"Add a claim to your package"});
  await custom.getByLabel("Condition or symptom").selectOption("Other / condition not listed");
  await custom.getByLabel("Condition or symptom name").fill("Shoulder symptoms");
  await expect(custom.getByText("Possible duplicate claim")).toBeVisible();
  await expect(custom.getByRole("button",{name:"Add Claim"})).toBeDisabled();
});

test("How Debrief works remains available without an orientation step",async({page})=>{
  await startCleanIntake(page);
  await completeSetup(page);
  await page.getByRole("button",{name:"How Debrief works"}).click();
  const briefing=page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."});
  await expect(briefing.getByRole("button",{name:"Return to package"})).toBeVisible();
  await expect(briefing.getByText("without occupying a permanent navigation item")).toBeVisible();
  await briefing.getByRole("button",{name:"Return to package"}).click();
  await expect(page.getByRole("button",{name:/Orientation/})).toHaveCount(0);
});

test("clean onboarding remains usable at mobile and desktop widths",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await expectNoOverflow(page);
  const briefing=page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."});
  await expect(briefing.getByRole("button",{name:"Choose package type"})).toBeVisible();
  await briefing.getByRole("button",{name:"Choose package type"}).click();
  await page.getByRole("radio",{name:/New disability claim/}).check();
  await page.getByRole("button",{name:"Continue to Service & Health"}).click();
  await page.getByRole("button",{name:"Open navigation"}).click();
  const journey=page.getByRole("complementary",{name:"Claim package navigation"});
  await expect(journey.getByRole("button",{name:/Service & Health/})).toBeVisible();
  await expect(journey.getByRole("button",{name:/Orientation/})).toHaveCount(0);
  await journey.getByRole("button",{name:"Close navigation"}).click();
  for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
    await page.setViewportSize(viewport);
    await expectNoOverflow(page);
    await expect(page.getByRole("heading",{name:"Start with what only you know."})).toBeVisible();
  }
});

test("empty setup is saved honestly and points back to the foundation",async({page})=>{
  await startCleanIntake(page);
  await completeSetup(page);
  await expect(page.getByText("Your package has started, but your foundation is still empty.")).toBeVisible();
  await expect(page.getByRole("heading",{name:"Complete your service and health foundation"})).toBeVisible();
  await expect(page.getByText("Not started",{exact:true})).toBeVisible();
});

test("service periods use structured type and calendar controls",async({page})=>{
  await startCleanIntake(page);
  await page.getByRole("button",{name:"Add service period"}).first().click();
  const dialog=page.getByRole("dialog",{name:"Add a service period"});
  await expect(dialog.getByLabel("Branch and service component")).toHaveJSProperty("tagName","SELECT");
  await expect(dialog.getByLabel("Period type")).toHaveJSProperty("tagName","SELECT");
  await expect(dialog.getByLabel("Start date")).toHaveAttribute("type","date");
  await expect(dialog.getByLabel("End date")).toHaveAttribute("type","date");
});

test("package overview exposes one prominent action-required control",async({page})=>{
  await startCleanIntake(page);
  await completeSetup(page);
  const next=page.locator(".rw-next");
  await expect(next.getByText("ACTION REQUIRED",{exact:true})).toBeVisible();
  await expect(next.getByRole("button")).toHaveCount(1);
  await expect(next.getByRole("button",{name:"Complete Service & Health"})).toBeVisible();
  await next.getByRole("button",{name:"Complete Service & Health"}).click();
  await expect(page.getByRole("heading",{name:"Start with what only you know."})).toBeVisible();
});

test("two claims keep separate drafts and readiness",async({page})=>{
  await startCleanIntake(page);
  await addKneeIntake(page);
  await completeSetup(page);
  await page.getByRole("button",{name:/Claim Leads/}).click();
  for(const title of ["Fictional shoulder symptoms","Fictional hearing symptoms"]){
    await addOtherClaim(page,title);
  }
  await page.getByRole("button",{name:"Open Package Overview"}).click();
  await page.getByRole("button",{name:"Open Fictional shoulder symptoms"}).click();
  await page.getByRole("textbox",{name:/In-service event/}).fill("A shoulder event entered only for this claim.");
  await page.getByRole("button",{name:"Package Overview",exact:true}).click();
  await page.getByRole("button",{name:"Open Fictional hearing symptoms"}).click();
  await expect(page.getByRole("textbox",{name:/In-service event/})).toHaveValue("");
  await page.getByRole("button",{name:"Check Package Readiness"}).click();
  await expect(page.locator(".rw-claim-readiness article")).toHaveCount(2);
  await expect(page.locator("#rework-main").getByText("Fictional shoulder symptoms",{exact:true})).toBeVisible();
  await expect(page.locator("#rework-main").getByText("Fictional hearing symptoms",{exact:true})).toBeVisible();
  await page.getByRole("tab",{name:/Final approval/}).click();
  await expect(page.getByRole("button",{name:"Approve entire package"})).toBeDisabled();
});

test("uploaded findings open a durable source and can link to a claim",async({page})=>{
  await startCleanIntake(page);
  await page.getByRole("button",{name:"Continue to documents"}).click();
  await page.getByRole("button",{name:"Simulate upload"}).click();
  await expect(page.getByRole("button",{name:/Right knee/})).toBeVisible();
  await page.getByRole("button",{name:/Right knee/}).click();
  await expect(page.getByRole("dialog",{name:"Fictional orthopedic visit.pdf"})).toContainText("Page 3");
  await page.getByRole("dialog",{name:"Fictional orthopedic visit.pdf"}).getByRole("button",{name:"Confirm source"}).click();
  await page.getByRole("button",{name:"Finish setup"}).click();
  await page.getByRole("button",{name:/Claim Leads/}).click();
  await addOtherClaim(page,"Fictional knee claim");
  await page.getByRole("button",{name:"Open Package Overview"}).click();
  await page.getByRole("button",{name:"Open Fictional knee claim"}).click();
  await page.getByRole("button",{name:/Link Fictional orthopedic visit.pdf to Fictional knee claim/}).click();
  await expect(page.getByRole("button",{name:/Unlink Fictional orthopedic visit.pdf from Fictional knee claim/})).toBeVisible();
});

test("alternate package type changes claim prompts",async({page})=>{
  const briefing=page.getByRole("dialog",{name:"A well-supported claim starts with the right mission details."});
  await briefing.getByRole("button",{name:"Choose package type"}).click();
  await page.getByRole("radio",{name:/Increased rating/}).check();
  await page.getByRole("button",{name:"Continue to Service & Health"}).click();
  await completeSetup(page);
  await page.getByRole("button",{name:/Claim Leads/}).click();
  await addOtherClaim(page,"Fictional rated condition");
  await page.getByRole("button",{name:"Open Package Overview"}).click();
  await page.getByRole("button",{name:"Open Fictional rated condition"}).click();
  await expect(page.getByLabel("Claim path")).toHaveValue("increase");
  await expect(page.getByRole("textbox",{name:/What has worsened/})).toBeVisible();
});
