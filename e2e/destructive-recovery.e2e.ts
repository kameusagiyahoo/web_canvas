import { expect, test, type Page } from "@playwright/test";

type StoredDoc = {
  frames?: Array<{ id: string; name?: string }>;
  groups?: Array<{ id: string; items?: Array<{ id: string; label?: string; action?: { to?: string; transition?: string } }> }>;
};

const destructiveSeed = {
  title: "Destructive recovery",
  paletteKey: "purple",
  frame: "phone",
  brief: "",
  groups: [
    {
      id: "home-group",
      x: 32,
      y: 120,
      axis: "x",
      items: [
        {
          id: "go-details",
          kind: "button",
          label: "Go details",
          icon: null,
          variant: "filled",
          action: { to: "details", transition: "slide" },
        },
      ],
    },
    {
      id: "details-group",
      x: 564,
      y: 120,
      axis: "x",
      items: [
        {
          id: "details-label",
          kind: "button",
          label: "Details page",
          icon: null,
          variant: "filled",
        },
      ],
    },
  ],
  frames: [
    { id: "home", name: "Home", x: 0, y: 0 },
    { id: "details", name: "Details", x: 532, y: 0 },
  ],
};

async function readState(page: Page) {
  return page.evaluate(() => {
    const parse = (key: string) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    };
    return {
      doc: parse("m3e:doc"),
      activeId: parse("m3e:project:active"),
      library: parse("m3e:projects:v1"),
    };
  });
}

function itemById(doc: StoredDoc, id: string) {
  return doc.groups?.flatMap((group) => group.items ?? []).find((item) => item.id === id) ?? null;
}

async function openSeeded(page: Page) {
  await page.addInitScript(({ doc }) => {
    localStorage.clear();
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: destructiveSeed });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
}

async function openProjects(page: Page) {
  await page.getByRole("button", { name: "Project", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const manager = page.getByTestId("project-manager");
  await expect(manager).toBeVisible();
  return manager;
}

test("item and screen deletion recover through normal Undo history", async ({ page }) => {
  await openSeeded(page);
  const baseline = (await readState(page)).doc as StoredDoc;

  // Locate the routed Canvas item through the derived graph, delete it, then restore the exact document.
  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await graph.getByTestId("graph-edge-item:home:go-details:tap:details").click({ force: true });
  await graph.getByTestId("graph-edge-editor").getByRole("button", { name: "Edit source" }).click();
  await expect(graph).toBeHidden();
  await expect(page.getByTitle("Duplicate (Ctrl+D)")).toBeVisible();

  await page.keyboard.press("Delete");
  await expect.poll(async () => itemById((await readState(page)).doc as StoredDoc, "go-details")).toBeNull();
  await page.getByTitle("Undo").click();
  await expect.poll(async () => (await readState(page)).doc).toEqual(baseline);

  // Delete an entire Screen on mobile. The delete command removes its owned groups and inbound Navigation,
  // but the same Undo history must restore the complete pre-delete document in one step.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTitle("Screen").click();
  const deleteButtons = page.getByRole("button", { name: "Delete (Delete)", exact: true });
  await expect(deleteButtons).toHaveCount(2);
  await deleteButtons.nth(1).click();

  await expect.poll(async () => ((await readState(page)).doc as StoredDoc).frames?.length ?? 0).toBe(1);
  const afterScreenDelete = (await readState(page)).doc as StoredDoc;
  expect(afterScreenDelete.frames?.some((frame) => frame.id === "details")).toBe(false);
  expect(itemById(afterScreenDelete, "details-label")).toBeNull();
  expect(itemById(afterScreenDelete, "go-details")?.action).toBeUndefined();

  await page.getByRole("button", { name: "Close (Esc)", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(async () => (await readState(page)).doc).toEqual(baseline);
});

test("project deletion requires confirmation, cancellation is lossless, and the final project is protected", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();

  let manager = await openProjects(page);
  const initialCount = (await readState(page)).library?.projects?.length ?? 0;
  expect(initialCount).toBe(1);
  await manager.getByTestId("project-create").click();
  await expect(manager).toBeHidden();
  await expect.poll(async () => (await readState(page)).library?.projects?.length ?? 0).toBe(2);

  const twoProjectState = await readState(page);
  const deleteId = twoProjectState.activeId as string;
  const survivor = twoProjectState.library.projects.find((project: { id: string }) => project.id !== deleteId);
  expect(deleteId).toBeTruthy();
  expect(survivor?.id).toBeTruthy();

  manager = await openProjects(page);
  const deleteCard = manager.getByTestId(`project-card-${deleteId}`);
  const beforeCancel = await readState(page);
  let cancelMessage = "";
  page.once("dialog", async (dialog) => {
    cancelMessage = dialog.message();
    await dialog.dismiss();
  });
  await deleteCard.getByRole("button", { name: "Delete", exact: true }).click();
  expect(cancelMessage).toBe("Delete this project?");
  expect(await readState(page)).toEqual(beforeCancel);

  let confirmMessage = "";
  page.once("dialog", async (dialog) => {
    confirmMessage = dialog.message();
    await dialog.accept();
  });
  await deleteCard.getByRole("button", { name: "Delete", exact: true }).click();
  expect(confirmMessage).toBe("Delete this project?");

  await expect.poll(async () => (await readState(page)).library?.projects?.length ?? 0).toBe(1);
  await expect.poll(async () => (await readState(page)).activeId).toBe(survivor.id);
  const afterDelete = await readState(page);
  expect(afterDelete.library.projects.some((project: { id: string }) => project.id === deleteId)).toBe(false);
  expect(afterDelete.doc).toEqual(survivor.doc);

  // Project deletion is intentionally outside document Undo, so the last remaining Project cannot be deleted.
  const survivorCard = manager.getByTestId(`project-card-${survivor.id}`);
  await expect(survivorCard.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
});
