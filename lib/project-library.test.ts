import { describe, expect, it } from "vitest";
import {
  createLocalProject,
  deleteProject,
  duplicateProject,
  renameProject,
  saveProjectSnapshot,
  sortProjectsByUpdated,
  type ProjectLibrary,
} from "./project-library";
import type { Doc } from "./tokens";

const makeDoc = (title: string): Doc => ({
  title,
  paletteKey: "purple",
  frame: "phone",
  brief: "",
  frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
  groups: [],
});

const base = (): ProjectLibrary => ({
  version: 1,
  projects: [createLocalProject({ id: "a", doc: makeDoc("Alpha"), now: 10 })],
});

describe("project library", () => {
  it("creates and snapshots projects without changing their identity", () => {
    const library = saveProjectSnapshot(base(), "a", makeDoc("Alpha v2"), 20);
    expect(library.projects[0].id).toBe("a");
    expect(library.projects[0].doc.title).toBe("Alpha v2");
    expect(library.projects[0].updatedAt).toBe(20);
  });

  it("renames, duplicates and deletes projects", () => {
    const renamed = renameProject(base(), "a", "Renamed", 20);
    expect(renamed.projects[0].name).toBe("Renamed");
    const duplicated = duplicateProject(renamed, "a", "b", 30);
    expect(duplicated?.project.name).toBe("Renamed Copy");
    expect(duplicated?.project.doc).not.toBe(renamed.projects[0].doc);
    const deleted = deleteProject(duplicated!.library, "a");
    expect(deleted.projects.map((project) => project.id)).toEqual(["b"]);
  });

  it("sorts by most recently updated first", () => {
    const a = createLocalProject({ id: "a", doc: makeDoc("A"), now: 10 });
    const b = createLocalProject({ id: "b", doc: makeDoc("B"), now: 30 });
    expect(sortProjectsByUpdated([a, b]).map((project) => project.id)).toEqual(["b", "a"]);
  });
});
