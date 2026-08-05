import { expect, test } from "@playwright/test";
import { enableBrowserTestProfile } from "./fixtures";

test.beforeEach(async({page})=>enableBrowserTestProfile(page));

test("document intake handles fictional upload success, failure, and deletion",async({page})=>{
  const calls:string[]=[];
  page.on("dialog",dialog=>void dialog.accept());
  await page.route("**/api/workspaces",async route=>{
    calls.push(route.request().method()+" "+new URL(route.request().url()).pathname);
    await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({workspace:{id:"fictional-workspace",title:"Fictional migraines",updatedAt:"2026-08-05T12:00:00.000Z",_count:{documents:0}}})});
  });
  await page.route("**/api/documents",async route=>{
    calls.push(route.request().method()+" "+new URL(route.request().url()).pathname);
    await route.fulfill({status:202,contentType:"application/json",body:JSON.stringify({document:{id:"fictional-document",claimId:"fictional-workspace",originalName:"fictional-note.pdf",mimeType:"application/pdf",size:10,status:"PENDING_SCAN",provider:"test",createdAt:"2026-08-05T12:00:00.000Z"}})});
  });
  await page.route("**/api/documents/fictional-document",async route=>{
    calls.push(route.request().method()+" "+new URL(route.request().url()).pathname);
    await route.fulfill({status:204});
  });
  await page.goto("/intake");
  await page.getByLabel("Workspace name").fill("Fictional migraines");
  await page.getByRole("button",{name:"Create workspace"}).click();
  await expect(page.getByText("Workspace created.")).toBeVisible();
  await page.getByLabel("Choose a fictional test document").setInputFiles({name:"fictional-note.pdf",mimeType:"application/pdf",buffer:Buffer.from("fictional")});
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Upload document"}).click();
  await expect(page.getByText("Document received.")).toBeVisible();
  await page.getByRole("button",{name:"Delete fictional-note.pdf"}).click();
  await expect(page.getByText("The document was permanently deleted.")).toBeVisible();
  expect(calls).toEqual(["POST /api/workspaces","POST /api/documents","DELETE /api/documents/fictional-document"]);
});

test("document intake shows an upload service failure without losing the selected file",async({page})=>{
  await page.route("**/api/workspaces",route=>route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({workspace:{id:"fictional-workspace",title:"Fictional migraines",updatedAt:"2026-08-05T12:00:00.000Z",_count:{documents:0}}})}));
  await page.route("**/api/documents",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Document uploads are temporarily paused by the Alpha administrator."})}));
  await page.goto("/intake");
  await page.getByLabel("Workspace name").fill("Fictional migraines");
  await page.getByRole("button",{name:"Create workspace"}).click();
  await page.getByLabel("Choose a fictional test document").setInputFiles({name:"fictional-note.pdf",mimeType:"application/pdf",buffer:Buffer.from("fictional")});
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Upload document"}).click();
  await expect(page.getByRole("alert")).toContainText("temporarily paused");
  await expect(page.getByText("fictional-note.pdf")).toBeVisible();
});

test("claim archive, restore, and permanent delete send their intended private mutations",async({page})=>{
  const calls:string[]=[];
  page.on("dialog",dialog=>void dialog.accept());
  await page.route("**/api/claims/**",async route=>{
    calls.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await route.fulfill({status:route.request().method()==="DELETE"?204:200,contentType:"application/json",body:route.request().method()==="DELETE"?"":JSON.stringify({claim:{id:"fictional-active-claim"}})});
  });
  await page.goto("/dashboard");
  await page.getByRole("button",{name:"Archive Fictional active workspace claim"}).click();
  await page.getByRole("button",{name:"Restore Fictional archived workspace claim"}).click();
  await page.getByRole("button",{name:"Permanently delete Fictional active workspace claim"}).click();
  expect(calls).toContain("POST /api/claims/fictional-active-claim/actions");
  expect(calls).toContain("POST /api/claims/fictional-archived-claim/actions");
  expect(calls).toContain("DELETE /api/claims/fictional-active-claim");
});

test("account deletion requires a typed confirmation before the destructive request",async({page})=>{
  let deletions=0;
  await page.route("**/api/account",async route=>{deletions+=1;await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({receipt:{receiptId:"fictional-receipt"}})});});
  await page.goto("/account");
  await page.getByRole("button",{name:"Delete account and data"}).click();
  const finalAction=page.getByRole("button",{name:"Permanently delete account"});
  await expect(finalAction).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await expect(finalAction).toBeEnabled();
  await finalAction.click();
  await expect.poll(()=>deletions).toBe(1);
});
