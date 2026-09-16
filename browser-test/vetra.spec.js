import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("opens with a focused empty state and personalization", async ({ page }) => {
  await expect(page).toHaveTitle(/Vetra/);
  await expect(page.getByRole("heading", { name: "Turn a document into a listening experience." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sections" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Play" })).toBeHidden();
  await expect(page.getByText("Supports PDF, Word (.docx), TXT, and Markdown files", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Personalize color" }).click();
  await page.getByRole("radio", { name: "Blue" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-highlight-theme", "blue");
  await page.getByRole("button", { name: "Done" }).click();
  await page.locator("#emptyAddDocument").click();
  await expect(page.getByRole("heading", { name: "Add a document" })).toBeVisible();
});

test("answers product questions in the Vetra Help side panel", async ({ page }) => {
  await page.getByRole("button", { name: "Ask Vetra" }).click();
  await expect(page.getByRole("heading", { name: "Vetra Help" })).toBeVisible();
  await page.getByPlaceholder("Ask about using Vetra…").fill("How do I change the reading speed?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/speed button on the left side/i)).toBeVisible();
  await page.getByRole("button", { name: "Close Vetra Help" }).click();
  await expect(page.locator("#assistantPanel")).toHaveAttribute("aria-hidden", "true");
});

test("uploads a heading-based reading document", async ({ page }) => {
  await page.getByRole("button", { name: "Add document" }).click();
  await page.locator("#documentFile").setInputFiles({ name: "field-notes.md", mimeType: "text/markdown", buffer: Buffer.from("# Field Notes\n\n## Start\nFirst passage.\n\n## Findings\nSecond passage.") });
  await page.getByRole("button", { name: "Open in reader" }).click();
  await expect(page.getByRole("heading", { name: "Field Notes" })).toBeVisible();
  await page.getByRole("button", { name: "Accessibility options" }).click();
  await page.getByRole("radio", { name: "Large", exact: true }).check();
  await page.getByLabel("Extra spacing").check();
  await page.getByLabel("Reduce animation and movement").check();
  await page.getByLabel("Enlarge the current word").uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await expect(page.locator("html")).toHaveAttribute("data-reading-spacing", "extra");
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expect(page.locator("html")).toHaveAttribute("data-word-emphasis", "off");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Sections" }).click();
  await expect(page.locator("#sectionList").getByText("Findings")).toBeVisible();
  await page.getByRole("button", { name: "Close sections" }).click();
  await page.getByRole("button", { name: "Close document", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Return to the upload screen?" })).toBeVisible();
  await page.getByRole("button", { name: "Close document", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Turn a document into a listening experience." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeHidden();
});

test("completes worksheet controls and downloads a Word copy", async ({ page }) => {
  await page.getByRole("button", { name: "Add document" }).click();
  await page.getByRole("radio", { name: /Worksheet document/ }).check();
  await page.locator("#documentFile").setInputFiles({ name: "plan.md", mimeType: "text/markdown", buffer: Buffer.from("# Plan\n\n## Tasks\n☐ Approved. Why? __________") });
  await page.getByRole("button", { name: "Open in reader" }).click();
  await page.getByRole("button", { name: /Check this worksheet item/ }).click();
  await page.getByPlaceholder("Type your answer").fill("Because it is ready.");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word document" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-completed\.docx$/);
  await expect(page.getByText("Word document downloaded.")).toBeVisible();
});
