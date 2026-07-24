import { expect, test } from "@playwright/test";
import { captureBrowserErrors } from "./fixtures";

test.describe("TEST-008 meaningful interaction inventory",()=>{
  test("application shell navigation, search, notifications, and workspace controls work",async({page})=>{
    const errors=captureBrowserErrors(page);
    await page.goto("/dashboard");

    const collapse=page.getByRole("button",{name:"Collapse workspace column"});
    await expect(collapse).toBeVisible();
    await collapse.click();
    await expect(page.getByRole("button",{name:"Expand workspace column"})).toBeVisible();
    await page.getByRole("button",{name:"Expand workspace column"}).click();
    await expect(collapse).toBeVisible();

    await page.getByRole("button",{name:"Notifications"}).click();
    await expect(page.locator(".notifications-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".notifications-panel")).toBeHidden();

    const search=page.getByRole("textbox",{name:"Search conditions and forms"});
    await search.fill("migraine");
    const migraineResult=page.locator(".search-results a").filter({hasText:"Migraines"}).first();
    await expect(migraineResult).toBeVisible();
    await migraineResult.click();
    await expect(page).toHaveURL(/\/conditions\/migraines/);

    for(const [label,path] of [
      ["Dashboard","/dashboard"],
      ["Exposure record","/exposure-record-check"],
      ["Conditions","/conditions"],
      ["Forms","/forms"],
      ["Change log","/changelog"]
    ]){
      await page.getByRole("link",{name:label,exact:true}).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }

    expect(errors).toEqual([]);
  });

  test("conditions and forms can be narrowed, cleared, and opened",async({page})=>{
    const errors=captureBrowserErrors(page);
    await page.goto("/conditions");

    const conditionSearch=page.getByRole("textbox",{name:"Search conditions and diagnostic codes"});
    await conditionSearch.fill("migraine");
    const migraineGuide=page.locator('a[href="/conditions/migraines"]',{hasText:"Open rating guide"});
    await expect(migraineGuide).toBeVisible();
    await migraineGuide.click();
    await expect(page).toHaveURL(/\/conditions\/migraines/);

    await page.goto("/conditions");
    await page.getByRole("button",{name:/Musculoskeletal System/i}).click();
    await expect(page.getByRole("combobox",{name:"Filter by body system"})).toHaveValue("Musculoskeletal");
    await conditionSearch.fill("no fictional match");
    await expect(page.getByRole("heading",{name:"No matching condition or code"})).toBeVisible();
    await page.getByRole("button",{name:"Clear search and filter"}).click();
    await expect(page.getByRole("combobox",{name:"Filter by body system"})).toHaveValue("All");

    await page.goto("/forms");
    const formsSearch=page.getByRole("textbox",{name:"Search official forms"});
    await formsSearch.fill("2860");
    await expect(page.getByRole("link",{name:"View guide"})).toBeVisible();
    await page.getByRole("link",{name:"View guide"}).click();
    await expect(page).toHaveURL(/\/forms\/dd-2860/);

    await page.goto("/forms");
    await formsSearch.fill("no fictional match");
    await expect(page.getByRole("heading",{name:"No matching form"})).toBeVisible();
    await page.getByRole("combobox",{name:"Filter forms by category"}).selectOption({index:0});

    expect(errors).toEqual([]);
  });

  test("exposure check presents possible matches as educational guidance and can be reset",async({page})=>{
    const errors=captureBrowserErrors(page);
    await page.goto("/exposure-record-check");

    await page.locator("label",{hasText:"Gulf War era"}).click();
    await page.locator("label",{hasText:"Southwest Asia or Persian Gulf"}).click();
    await page.getByRole("button",{name:/Continue/i}).click();
    await expect(page.getByRole("heading",{name:"Add known or suspected exposures"})).toBeVisible();

    await page.locator("label",{hasText:"Smoke, burn pits, sand, or airborne hazards"}).click();
    await page.getByLabel(/Anything else to remember/i).fill("Fictional deployment note for automated testing.");
    await page.getByRole("button",{name:"See possible matches"}).click();
    await expect(page.getByRole("heading",{name:"Your possible matches"})).toBeVisible();
    await expect(page.getByText("A possible match is not confirmation.")).toBeVisible();
    await expect(page.getByRole("link",{name:"Start a new claim"})).toHaveAttribute("href","/claim-builder?new=1");

    await page.getByRole("button",{name:"Start over"}).click();
    await expect(page.getByRole("heading",{name:"Start with your service history"})).toBeVisible();
    await expect(page.getByRole("radio",{name:"Gulf War era"})).not.toBeChecked();

    expect(errors).toEqual([]);
  });
});
