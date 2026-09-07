import type { Doc } from "./tokens";
import { isProject } from "./project";
import type { StorageLike, StorageWriteResult } from "./storage";
import { readStoredJson, writeStoredJson } from "./storage";

export const PROJECT_LIBRARY_KEY = "m3e:projects:v1";
export const ACTIVE_PROJECT_KEY = "m3e:project:active";

export type LocalProject = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  doc: Doc;
};

export type ProjectLibrary = {
  version: 1;
  projects: LocalProject[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isLocalProject(value: unknown): value is LocalProject {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt) &&
    isProject(value.doc)
  );
}

export function readProjectLibrary(storage: StorageLike | null): ProjectLibrary {
  const value = readStoredJson(storage, PROJECT_LIBRARY_KEY);
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.projects)) {
    return { version: 1, projects: [] };
  }
  return {
    version: 1,
    projects: value.projects.filter(isLocalProject),
  };
}

export function writeProjectLibrary(
  storage: StorageLike | null,
  library: ProjectLibrary,
): StorageWriteResult {
  return writeStoredJson(storage, PROJECT_LIBRARY_KEY, library);
}

export function readActiveProjectId(storage: StorageLike | null): string | null {
  const value = readStoredJson(storage, ACTIVE_PROJECT_KEY);
  return typeof value === "string" && value ? value : null;
}

export function writeActiveProjectId(
  storage: StorageLike | null,
  id: string | null,
): StorageWriteResult {
  return writeStoredJson(storage, ACTIVE_PROJECT_KEY, id);
}

export function defaultProjectName(doc: Pick<Doc, "title">, index = 1): string {
  const title = doc.title.trim();
  return title || `Project ${index}`;
}

export function createLocalProject(args: {
  id: string;
  doc: Doc;
  name?: string;
  now?: number;
}): LocalProject {
  const now = args.now ?? Date.now();
  return {
    id: args.id,
    name: (args.name ?? defaultProjectName(args.doc)).trim() || "Untitled project",
    createdAt: now,
    updatedAt: now,
    doc: args.doc,
  };
}

export function upsertProject(
  library: ProjectLibrary,
  project: LocalProject,
): ProjectLibrary {
  const index = library.projects.findIndex((entry) => entry.id === project.id);
  if (index < 0) return { version: 1, projects: [project, ...library.projects] };
  const projects = [...library.projects];
  projects[index] = project;
  return { version: 1, projects };
}

export function saveProjectSnapshot(
  library: ProjectLibrary,
  id: string,
  doc: Doc,
  now = Date.now(),
): ProjectLibrary {
  const project = library.projects.find((entry) => entry.id === id);
  if (!project) return library;
  return upsertProject(library, {
    ...project,
    doc,
    updatedAt: now,
    name: project.name.trim() || defaultProjectName(doc),
  });
}

export function renameProject(
  library: ProjectLibrary,
  id: string,
  name: string,
  now = Date.now(),
): ProjectLibrary {
  const project = library.projects.find((entry) => entry.id === id);
  if (!project) return library;
  const nextName = name.trim();
  if (!nextName || nextName === project.name) return library;
  return upsertProject(library, { ...project, name: nextName, updatedAt: now });
}

export function duplicateProject(
  library: ProjectLibrary,
  id: string,
  newId: string,
  now = Date.now(),
): { library: ProjectLibrary; project: LocalProject } | null {
  const source = library.projects.find((entry) => entry.id === id);
  if (!source) return null;
  const project: LocalProject = {
    ...source,
    id: newId,
    name: `${source.name} Copy`,
    createdAt: now,
    updatedAt: now,
    doc: structuredClone(source.doc),
  };
  return { library: upsertProject(library, project), project };
}

export function deleteProject(
  library: ProjectLibrary,
  id: string,
): ProjectLibrary {
  return { version: 1, projects: library.projects.filter((entry) => entry.id !== id) };
}

export function sortProjectsByUpdated(projects: readonly LocalProject[]): LocalProject[] {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}
