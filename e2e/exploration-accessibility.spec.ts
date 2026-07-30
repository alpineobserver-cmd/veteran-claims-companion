import { expect, test } from "@playwright/test";
import { captureBrowserErrors } from "./fixtures";

test("public navigation search, sidebar preference, and mobile menu remain usable", async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto("/dashboard");

  const search = page.getByRole("textbox", { name: "Search conditions and forms" });
  await search.fill("tinnitus");
  const results = page.getByRole("listbox", { name: "Search results" });
  await expect(results).toBeVisible();
  await expect(results.getByRole("option", { name: /Tinnitus Hearing and sensory/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(results).toBeHidden();
  await expect(search).toHaveValue("");

  const collapse = page.getByRole("button", { name: "Collapse workspace column" });
  await collapse.click();
  await expect(page.locator(".shell")).toHaveClass(/sidebar-collapsed/);
  await page.reload();
  await expect(page.locator(".shell")).toHaveClass(/sidebar-collapsed/);
  await page.getByRole("button", { name: "Expand workspace column" }).click();
  await expect(page.locator(".shell")).not.toHaveClass(/sidebar-collapsed/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("complementary", { name: "Companion navigation" }).getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  expect(browserErrors).toEqual([]);
});

test("condition and form discovery handles successful and empty searches", async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto("/conditions");

  const conditionSearch = page.getByRole("textbox", { name: "Search conditions and diagnostic codes" });
  await conditionSearch.fill("tinnitus");
  await expect(page.locator(".condition-directory")).toContainText("Tinnitus");
  await expect(page.locator(".library-count")).toContainText("matching condition");
  await conditionSearch.fill("fictional condition that is not indexed");
  await expect(page.getByRole("heading", { name: "No matching condition or code" })).toBeVisible();
  await page.getByRole("button", { name: "Clear search and filter" }).click();
  await expect(conditionSearch).toHaveValue("");
  await expect(page.locator(".condition-directory")).toBeVisible();

  await page.goto("/forms");
  const formSearch = page.getByRole("textbox", { name: "Search official forms" });
  await formSearch.fill("2860");
  const formCard = page.locator(".form-card");
  await expect(formCard).toHaveCount(1);
  await expect(formCard).toContainText("DD Form 2860");
  const download = formCard.getByRole("link", { name: /Download PDF/ });
  await expect(download).toHaveAttribute("href", /dd2860\.pdf$/);
  await expect(download).toHaveAttribute("target", "_blank");
  expect(browserErrors).toEqual([]);
});

test("exposure record check validates required history, shows cautious matches, and resets", async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto("/exposure-record-check");

  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator(".erc-error")).toHaveCount(2);
  await page.locator(".erc-choice").filter({ hasText: "Post-9/11" }).click();
  await page.locator(".erc-check").filter({ hasText: "Afghanistan or a nearby qualifying area" }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: "Add known or suspected exposures" })).toBeFocused();

  await page.locator(".erc-exposure").filter({ hasText: "Smoke, burn pits, sand, or airborne hazards" }).click();
  await page.getByRole("button", { name: "See possible matches" }).click();
  await expect(page.getByRole("heading", { name: "Your possible matches" })).toBeFocused();
  await expect(page.getByText("A possible match is not confirmation.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Airborne Hazards and Open Burn Pit Registry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Individual Longitudinal Exposure Record" })).toBeVisible();

  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { name: "Start with your service history" })).toBeFocused();
  await expect(page.getByLabel(/Post-9\/11/)).not.toBeChecked();
  await expect(page.getByLabel("Afghanistan or a nearby qualifying area")).not.toBeChecked();
  expect(browserErrors).toEqual([]);
});
