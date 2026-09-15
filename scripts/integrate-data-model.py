from pathlib import Path

PAGE = Path("app/page.tsx")
DOC = Path("docs/DATA_MODEL.md")
WORKFLOW = Path(".github/workflows/data-model-integration.yml")
SELF = Path("scripts/integrate-data-model.py")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


text = PAGE.read_text()

text = replace_once(
    text,
    'import { ArchitectureFlowView } from "@/components/ArchitectureFlow";\nimport { ProjectManager } from "@/components/ProjectManager";',
    'import { ArchitectureFlowView } from "@/components/ArchitectureFlow";\nimport { DataModelWorkspace } from "@/components/DataModelWorkspace";\nimport type { DataModelSubjectOption } from "@/components/DataModelView";\nimport { ProjectManager } from "@/components/ProjectManager";',
    "component imports",
)
text = replace_once(
    text,
    'import { addArchitectureAction, addArchitectureApi, bindArchitectureActionSource, connectArchitectureNodes, createArchitectureQuickFlow, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, duplicateArchitectureNode, renameArchitectureAction, updateArchitectureApi, updateArchitectureEdgeLabel } from "@/lib/architecture-flow";',
    'import { addArchitectureAction, addArchitectureApi, bindArchitectureActionSource, connectArchitectureNodes, createArchitectureQuickFlow, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, duplicateArchitectureNode, renameArchitectureAction, updateArchitectureApi, updateArchitectureEdgeLabel } from "@/lib/architecture-flow";\nimport { emptyDataModel, type DataModel } from "@/lib/data-model";\nimport { dataModelFromDocument, type DataModelDocument } from "@/lib/data-model-document";',
    "data model imports",
)
text = replace_once(
    text,
    'type DocMeta = Omit<Doc, "groups" | "frames">;',
    'type DocMeta = Omit<DataModelDocument, "groups" | "frames">;',
    "history metadata type",
)
text = replace_once(
    text,
    '  const [architecture, setArchitecture] = useState<ArchitectureFlow>(emptyArchitectureFlow());\n  const [paletteKey, setPaletteKey] = useState("purple");',
    '  const [architecture, setArchitecture] = useState<ArchitectureFlow>(emptyArchitectureFlow());\n  const [dataModel, setDataModel] = useState<DataModel>(emptyDataModel);\n  const [paletteKey, setPaletteKey] = useState("purple");',
    "data model state",
)
text = replace_once(
    text,
    '    if (doc.architecture?.version === 1) setArchitecture(doc.architecture);\n    else if (reset) setArchitecture(emptyArchitectureFlow());\n    if (typeof doc.paletteKey === "string" && doc.paletteKey) setPaletteKey(doc.paletteKey);',
    '    if (doc.architecture?.version === 1) setArchitecture(doc.architecture);\n    else if (reset) setArchitecture(emptyArchitectureFlow());\n    const nextDataModel = dataModelFromDocument(doc);\n    if (nextDataModel) setDataModel(nextDataModel);\n    else if (reset) setDataModel(emptyDataModel());\n    if (typeof doc.paletteKey === "string" && doc.paletteKey) setPaletteKey(doc.paletteKey);',
    "apply data model",
)
text = replace_once(
    text,
    '    const nextDoc: Doc = {\n      groups,\n      frames,\n      architecture,\n      paletteKey,',
    '    const nextDoc: DataModelDocument = {\n      groups,\n      frames,\n      architecture,\n      dataModel,\n      paletteKey,',
    "autosave document",
)
text = replace_once(
    text,
    '  }, [editAccess, groups, frames, architecture, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme, activeProjectId]);',
    '  }, [editAccess, groups, frames, architecture, dataModel, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme, activeProjectId]);',
    "autosave dependencies",
)
text = replace_once(
    text,
    '    if (groupsRef.current.length === 0 && framesRef.current.length === 0 && architecture.nodes.length === 0 && architecture.edges.length === 0)\n      return;',
    '    if (\n      groupsRef.current.length === 0 &&\n      framesRef.current.length === 0 &&\n      architecture.nodes.length === 0 &&\n      architecture.edges.length === 0 &&\n      dataModel.entities.length === 0 &&\n      dataModel.relations.length === 0 &&\n      dataModel.bindings.length === 0\n    ) return;',
    "clear guard",
)
text = replace_once(
    text,
    '    setGroups([]);\n    setFrames([]);\n    setArchitecture(emptyArchitectureFlow());\n    setSelectedIds([]);',
    '    setGroups([]);\n    setFrames([]);\n    setArchitecture(emptyArchitectureFlow());\n    setDataModel(emptyDataModel());\n    setSelectedIds([]);',
    "clear data model",
)

architecture_handoff = '''  const openArchitectureActionFromInspector = (actionId: string) => {
    setArchitectureFocus({ kind: "action", id: actionId });
    setArchitectureOpen(true);
    if (mobileRef.current) setSheet(null);
  };
'''
data_model_handoff = architecture_handoff + '''
  const commitDataModel = (next: DataModel) => {
    if (next === dataModel) return;
    snapshot(true);
    setDataModel(next);
  };

  const dataModelSubjects = useMemo<DataModelSubjectOption[]>(() => {
    const screenSubjects: DataModelSubjectOption[] = frames.map((screen) => ({
      kind: "frame",
      id: screen.id,
      label: screen.name || "Screen",
    }));
    const itemSubjects: DataModelSubjectOption[] = groups.flatMap((group) => {
      const owningFrame = frameOfGroup(group, frames, widths);
      return group.items.map((item) => ({
        kind: "item" as const,
        id: item.id,
        label: item.label.trim() || KIND_SPEC[item.kind].label,
        detail: owningFrame?.name || undefined,
      }));
    });
    const architectureSubjects: DataModelSubjectOption[] = architecture.nodes.map((node) => ({
      kind: node.kind,
      id: node.id,
      label: node.name,
      detail: node.kind === "api" ? `${node.method} ${node.path}` : undefined,
    }));
    return [...screenSubjects, ...itemSubjects, ...architectureSubjects];
  }, [frames, groups, widths, architecture.nodes]);

  const openDataModelSubject = (subject: DataModelSubjectOption) => {
    if (subject.kind === "frame") {
      setSelectedIds([]);
      setSelectedLinkId(null);
      setSelectedFrameId(subject.id);
      setLayersFrameId(subject.id);
      focusFrame(subject.id);
      return;
    }
    if (subject.kind === "item") {
      const group = groupsRef.current.find((candidate) => candidate.items.some((item) => item.id === subject.id));
      if (!group) return;
      const owningFrame = frameOfGroup(group, framesRef.current, widthsRef.current);
      setSelectedIds([subject.id]);
      setSelectedFrameId(null);
      setSelectedLinkId(null);
      setRightTab("edit");
      if (mobileRef.current) setSheet("edit");
      else setRightOpen(true);
      if (owningFrame) {
        setLayersFrameId(owningFrame.id);
        focusFrame(owningFrame.id);
      }
      return;
    }
    setArchitectureFocus({ kind: subject.kind, id: subject.id });
    setArchitectureOpen(true);
    if (mobileRef.current) setSheet(null);
  };
'''
text = replace_once(text, architecture_handoff, data_model_handoff, "data model commands and handoff")

text = replace_once(
    text,
    '  const doc: Doc = useMemo(\n    () => ({ groups, frames, architecture, paletteKey, frame, title, brief, promptEdit, platform: platform ?? undefined, customPalette: customPalette ?? undefined, dynamicColor, theme }),\n    [groups, frames, architecture, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme],\n  );',
    '  const doc: DataModelDocument = useMemo(\n    () => ({ groups, frames, architecture, dataModel, paletteKey, frame, title, brief, promptEdit, platform: platform ?? undefined, customPalette: customPalette ?? undefined, dynamicColor, theme }),\n    [groups, frames, architecture, dataModel, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme],\n  );',
    "current document",
)
text = replace_once(
    text,
    '    const fresh: Doc = {\n      title: "",\n      brief: "",\n      paletteKey: "purple",',
    '    const fresh: DataModelDocument = {\n      title: "",\n      brief: "",\n      paletteKey: "purple",',
    "fresh project type",
)
text = replace_once(
    text,
    '      frames: [localizedSeedFrame(lang)],\n      dynamicColor: false,',
    '      frames: [localizedSeedFrame(lang)],\n      dataModel: emptyDataModel(),\n      dynamicColor: false,',
    "fresh project data model",
)
text = replace_once(
    text,
    '            onClear={() => {\n              if (groupsRef.current.length || framesRef.current.length) setConfirmClear(true);\n            }}',
    '            onClear={() => {\n              if (\n                groupsRef.current.length ||\n                framesRef.current.length ||\n                architecture.nodes.length ||\n                architecture.edges.length ||\n                dataModel.entities.length ||\n                dataModel.relations.length ||\n                dataModel.bindings.length\n              ) setConfirmClear(true);\n            }}',
    "clear button guard",
)

marker = '''          />

          {isMobile && (
            <div
'''
workspace = '''          />

          <DataModelWorkspace
            model={dataModel}
            onChange={commitDataModel}
            palette={p}
            subjects={dataModelSubjects}
            onOpenSubject={openDataModelSubject}
            mobile={isMobile}
            readOnly={editAccess !== "editable"}
          />

          {isMobile && (
            <div
'''
text = replace_once(text, marker, workspace, "workspace render")

PAGE.write_text(text)

# Record the now-real integration contract next to the domain-model documentation.
doc = DOC.read_text()
section = '''

## Editor integration

Status: implemented on the Data Model foundation branch.

- The active editor document carries an optional version-1 `dataModel` payload.
- Legacy projects without it open with an empty Data Model.
- Local autosave, managed-project snapshots, JSON export/import, whole-document Undo/Redo and project switching carry the same payload.
- The Canvas exposes one Data Model workspace on desktop and mobile; ER coordinates remain derived and are never persisted.
- `DataBinding` connects an Entity to an existing Screen (`frame`), Canvas part (`item`), Architecture Action, or Architecture API without duplicating those objects.
- A binding can describe `read`, `create`, `update`, and/or `delete` access and can jump back to the real Canvas or Architecture object.
- Bindings are descriptive design metadata only. They do not execute API/database work and do not change Preview navigation.

This completes the first Single Source, Multiple Views loop:

```text
Canvas Screen / Part ─┐
Architecture Action ──┼─ DataBinding ─ Entity ─ Relation ─ Entity
Architecture API ─────┘
```
'''
if "## Editor integration" not in doc:
    DOC.write_text(doc.rstrip() + section + "\n")

# The workflow and this script are one-shot scaffolding; keep the product branch clean.
SELF.unlink(missing_ok=True)
WORKFLOW.unlink(missing_ok=True)
