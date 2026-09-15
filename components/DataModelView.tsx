"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  addDataBinding,
  addDataEntity,
  addDataField,
  cardinalityLabels,
  connectDataEntities,
  deleteDataBinding,
  deleteDataEntity,
  deleteDataField,
  deleteDataRelation,
  diagnoseDataModel,
  layoutDataModel,
  makeDataId,
  updateDataEntity,
  updateDataField,
  type DataAccessKind,
  type DataBindingSubjectKind,
  type DataFieldType,
  type DataModel,
  type DataRelationCardinality,
} from "@/lib/data-model";

export type DataModelViewColors = {
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  outline: string;
  outlineVariant: string;
  error: string;
};

export type DataModelSubjectOption = {
  kind: DataBindingSubjectKind;
  id: string;
  label: string;
  detail?: string;
};

const DEFAULT_COLORS: DataModelViewColors = {
  surface: "#FEF7FF",
  surfaceContainer: "#F3EDF7",
  surfaceContainerHigh: "#ECE6F0",
  onSurface: "#1D1B20",
  onSurfaceVariant: "#49454F",
  primary: "#6750A4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#EADDFF",
  onPrimaryContainer: "#21005D",
  outline: "#79747E",
  outlineVariant: "#CAC4D0",
  error: "#B3261E",
};

const FIELD_TYPES: DataFieldType[] = [
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "uuid",
  "json",
  "reference",
];

const CARDINALITIES: { value: DataRelationCardinality; label: string }[] = [
  { value: "one-to-one", label: "1 → 1" },
  { value: "one-to-many", label: "1 → many" },
  { value: "many-to-one", label: "many → 1" },
  { value: "many-to-many", label: "many → many" },
];

const ACCESS_KINDS: { value: DataAccessKind; label: string }[] = [
  { value: "read", label: "Read" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
];

const subjectKey = (subject: Pick<DataModelSubjectOption, "kind" | "id">) =>
  `${subject.kind}|${subject.id}`;

const controlStyle = (colors: DataModelViewColors): CSSProperties => ({
  minHeight: 40,
  borderRadius: 12,
  border: `1px solid ${colors.outlineVariant}`,
  background: colors.surface,
  color: colors.onSurface,
  padding: "8px 10px",
  font: "inherit",
  boxSizing: "border-box",
});

const buttonStyle = (
  colors: DataModelViewColors,
  variant: "filled" | "tonal" | "text" = "tonal",
): CSSProperties => ({
  minHeight: 40,
  borderRadius: 20,
  border: variant === "text" ? "none" : `1px solid ${colors.outlineVariant}`,
  background:
    variant === "filled"
      ? colors.primary
      : variant === "tonal"
        ? colors.primaryContainer
        : "transparent",
  color:
    variant === "filled"
      ? colors.onPrimary
      : variant === "tonal"
        ? colors.onPrimaryContainer
        : colors.primary,
  padding: "8px 14px",
  font: "inherit",
  fontWeight: 650,
  cursor: "pointer",
});

const sectionStyle = (colors: DataModelViewColors): CSSProperties => ({
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 18,
  background: colors.surfaceContainer,
});

export function DataModelView({
  model,
  onChange,
  onClose,
  colors = DEFAULT_COLORS,
  readOnly = false,
  subjects = [],
  onOpenSubject,
}: {
  model: DataModel;
  onChange: (next: DataModel) => void;
  onClose?: () => void;
  colors?: DataModelViewColors;
  readOnly?: boolean;
  subjects?: DataModelSubjectOption[];
  onOpenSubject?: (subject: DataModelSubjectOption) => void;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(model.entities[0]?.id ?? null);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<DataFieldType>("string");
  const [relationTargetId, setRelationTargetId] = useState("");
  const [cardinality, setCardinality] = useState<DataRelationCardinality>("one-to-many");
  const [bindingSubjectKey, setBindingSubjectKey] = useState("");
  const [bindingAccess, setBindingAccess] = useState<DataAccessKind[]>(["read"]);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 840px)");
    const apply = () => setCompact(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (selectedEntityId && model.entities.some((entity) => entity.id === selectedEntityId)) return;
    setSelectedEntityId(model.entities[0]?.id ?? null);
  }, [model.entities, selectedEntityId]);

  const layout = useMemo(() => layoutDataModel(model), [model]);
  const diagnostics = useMemo(() => diagnoseDataModel(model), [model]);
  const selected = model.entities.find((entity) => entity.id === selectedEntityId) ?? null;
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes]);
  const relationById = useMemo(
    () => new Map(model.relations.map((relation) => [relation.id, relation])),
    [model.relations],
  );
  const subjectByKey = useMemo(
    () => new Map(subjects.map((subject) => [subjectKey(subject), subject])),
    [subjects],
  );
  const bindingsForSelected = useMemo(
    () => selected ? model.bindings.filter((binding) => binding.entityId === selected.id) : [],
    [model.bindings, selected],
  );

  const commit = (next: DataModel) => {
    if (next !== model) onChange(next);
  };

  const addEntity = () => {
    if (readOnly) return;
    const ordinal = model.entities.length + 1;
    const id = makeDataId("entity");
    const next = addDataEntity(model, { id, name: `Entity ${ordinal}`, fields: [] });
    commit(next);
    if (next !== model) setSelectedEntityId(id);
  };

  const addField = () => {
    if (readOnly || !selected || !fieldName.trim()) return;
    const next = addDataField(model, selected.id, {
      id: makeDataId("field"),
      name: fieldName,
      type: fieldType,
    });
    commit(next);
    if (next !== model) setFieldName("");
  };

  const addRelation = () => {
    if (readOnly || !selected || !relationTargetId) return;
    const next = connectDataEntities(model, {
      id: makeDataId("relation"),
      sourceEntityId: selected.id,
      targetEntityId: relationTargetId,
      cardinality,
    });
    commit(next);
  };

  const addBinding = () => {
    if (readOnly || !selected || !bindingSubjectKey || bindingAccess.length === 0) return;
    const subject = subjectByKey.get(bindingSubjectKey);
    if (!subject) return;
    const next = addDataBinding(model, {
      id: makeDataId("binding"),
      subject: { kind: subject.kind, id: subject.id },
      entityId: selected.id,
      access: bindingAccess,
    });
    commit(next);
  };

  const toggleAccess = (access: DataAccessKind) => {
    setBindingAccess((current) =>
      current.includes(access)
        ? current.filter((value) => value !== access)
        : [...current, access],
    );
  };

  const relationRows = selected
    ? model.relations.filter(
        (relation) =>
          relation.sourceEntityId === selected.id || relation.targetEntityId === selected.id,
      )
    : [];

  return (
    <section
      aria-label="Data model"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        gridTemplateRows: "64px minmax(0, 1fr)",
        background: colors.surface,
        color: colors.onSurface,
        fontFamily: "inherit",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px 0 16px",
          borderBottom: `1px solid ${colors.outlineVariant}`,
          background: colors.surface,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 750 }}>Data model</div>
          {!compact && (
            <div style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
              {model.entities.length} entities · {model.relations.length} relations · {model.bindings.length} bindings · {diagnostics.length} diagnostics
            </div>
          )}
        </div>
        {!readOnly && (
          <button type="button" onClick={addEntity} style={buttonStyle(colors, "filled")}>
            + Entity
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} style={buttonStyle(colors, "text")} aria-label="Close data model">
            Close
          </button>
        )}
      </header>

      <div
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: compact || !selected ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(300px, 360px)",
          gridTemplateRows: compact && selected ? "minmax(280px, 52vh) minmax(0, 1fr)" : undefined,
        }}
      >
        <div style={{ minWidth: 0, minHeight: 0, overflow: "auto", background: colors.surfaceContainer }}>
          {model.entities.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "grid",
                placeItems: "center",
                padding: 32,
                textAlign: "center",
                color: colors.onSurfaceVariant,
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 750, color: colors.onSurface }}>No entities yet</div>
                <p style={{ maxWidth: 440, lineHeight: 1.6 }}>
                  Add an entity to describe the data shared by screens, Canvas parts, Actions and APIs.
                </p>
                {!readOnly && (
                  <button type="button" onClick={addEntity} style={buttonStyle(colors, "filled")}>
                    Create first entity
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", width: layout.width, height: layout.height }}>
              <svg
                aria-hidden="true"
                width={layout.width}
                height={layout.height}
                style={{ position: "absolute", inset: 0, overflow: "visible" }}
              >
                {layout.edges.map((edge) => {
                  const relation = relationById.get(edge.id);
                  if (!relation) return null;
                  const [fromLabel, toLabel] = cardinalityLabels(relation.cardinality);
                  const middleX = (edge.x1 + edge.x2) / 2;
                  const path = `M ${edge.x1} ${edge.y1} C ${middleX} ${edge.y1}, ${middleX} ${edge.y2}, ${edge.x2} ${edge.y2}`;
                  return (
                    <g key={edge.id}>
                      <path d={path} fill="none" stroke={colors.outline} strokeWidth={2} />
                      <circle cx={edge.x1} cy={edge.y1} r={4} fill={colors.primary} />
                      <circle cx={edge.x2} cy={edge.y2} r={4} fill={colors.primary} />
                      <text x={edge.x1 + 10} y={edge.y1 - 8} fontSize={12} fill={colors.onSurfaceVariant}>
                        {fromLabel}
                      </text>
                      <text x={edge.x2 - 14} y={edge.y2 - 8} fontSize={12} fill={colors.onSurfaceVariant}>
                        {toLabel}
                      </text>
                      {relation.label && (
                        <text x={middleX} y={(edge.y1 + edge.y2) / 2 - 8} textAnchor="middle" fontSize={12} fill={colors.onSurfaceVariant}>
                          {relation.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {model.entities.map((entity) => {
                const node = nodeById.get(entity.id);
                if (!node) return null;
                const selectedNode = entity.id === selectedEntityId;
                return (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => setSelectedEntityId(entity.id)}
                    aria-pressed={selectedNode}
                    style={{
                      position: "absolute",
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      minHeight: node.height,
                      borderRadius: 20,
                      overflow: "hidden",
                      border: `${selectedNode ? 3 : 1}px solid ${selectedNode ? colors.primary : colors.outlineVariant}`,
                      background: colors.surface,
                      color: colors.onSurface,
                      textAlign: "left",
                      padding: 0,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        minHeight: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "10px 14px",
                        background: selectedNode ? colors.primaryContainer : colors.surfaceContainerHigh,
                        color: selectedNode ? colors.onPrimaryContainer : colors.onSurface,
                      }}
                    >
                      <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entity.name}</strong>
                      <span style={{ fontSize: 11, opacity: 0.75 }}>{entity.fields.length}</span>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      {entity.fields.length === 0 ? (
                        <div style={{ padding: "10px 14px", color: colors.onSurfaceVariant, fontSize: 13 }}>No fields</div>
                      ) : (
                        entity.fields.map((field) => (
                          <div
                            key={field.id}
                            style={{
                              height: 32,
                              display: "grid",
                              gridTemplateColumns: "24px minmax(0, 1fr) auto",
                              alignItems: "center",
                              gap: 6,
                              padding: "0 14px",
                              fontSize: 13,
                            }}
                          >
                            <span aria-hidden="true" style={{ color: colors.primary, fontWeight: 750, fontSize: 10 }}>
                              {field.primaryKey ? "PK" : field.type === "reference" ? "FK" : "·"}
                            </span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.name}</span>
                            <span style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>{field.type}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <aside
            aria-label={`${selected.name} entity inspector`}
            style={{
              minWidth: 0,
              minHeight: 0,
              overflow: "auto",
              borderLeft: compact ? "none" : `1px solid ${colors.outlineVariant}`,
              borderTop: compact ? `1px solid ${colors.outlineVariant}` : "none",
              background: colors.surface,
              padding: compact ? 12 : 16,
            }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <section style={sectionStyle(colors)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong>Entity</strong>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextId = model.entities.find((entity) => entity.id !== selected.id)?.id ?? null;
                        commit(deleteDataEntity(model, selected.id));
                        setSelectedEntityId(nextId);
                      }}
                      style={{ ...buttonStyle(colors, "text"), color: colors.error }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <input
                  aria-label="Entity name"
                  value={selected.name}
                  readOnly={readOnly}
                  onChange={(event) => commit(updateDataEntity(model, selected.id, { name: event.target.value }))}
                  style={controlStyle(colors)}
                />
                <textarea
                  aria-label="Entity note"
                  value={selected.note ?? ""}
                  readOnly={readOnly}
                  onChange={(event) => commit(updateDataEntity(model, selected.id, { note: event.target.value }))}
                  placeholder="What does this entity represent?"
                  rows={2}
                  style={{ ...controlStyle(colors), resize: "vertical" }}
                />
              </section>

              <section style={sectionStyle(colors)}>
                <strong>Fields</strong>
                {selected.fields.length === 0 && (
                  <div style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>No fields yet.</div>
                )}
                {selected.fields.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 8,
                      padding: 10,
                      borderRadius: 14,
                      background: colors.surface,
                      border: `1px solid ${colors.outlineVariant}`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis" }}>{field.name}</div>
                      <div style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                        {field.type}{field.primaryKey ? " · primary key" : ""}{field.required ? " · required" : ""}{field.unique ? " · unique" : ""}
                      </div>
                      {!readOnly && (
                        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={!!field.primaryKey}
                              onChange={(event) => commit(updateDataField(model, selected.id, field.id, { primaryKey: event.target.checked }))}
                            />
                            PK
                          </label>
                          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={!!field.required}
                              onChange={(event) => commit(updateDataField(model, selected.id, field.id, { required: event.target.checked }))}
                            />
                            Required
                          </label>
                          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={!!field.unique}
                              onChange={(event) => commit(updateDataField(model, selected.id, field.id, { unique: event.target.checked }))}
                            />
                            Unique
                          </label>
                        </div>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label={`Delete ${field.name}`}
                        onClick={() => commit(deleteDataField(model, selected.id, field.id))}
                        style={{ ...buttonStyle(colors, "text"), minHeight: 32, padding: "4px 8px", color: colors.error }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
                    <input
                      aria-label="New field name"
                      value={fieldName}
                      onChange={(event) => setFieldName(event.target.value)}
                      placeholder="Field name"
                      onKeyDown={(event) => { if (event.key === "Enter") addField(); }}
                      style={controlStyle(colors)}
                    />
                    <select aria-label="Field type" value={fieldType} onChange={(event) => setFieldType(event.target.value as DataFieldType)} style={controlStyle(colors)}>
                      {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button type="button" onClick={addField} disabled={!fieldName.trim()} style={{ ...buttonStyle(colors), gridColumn: "1 / -1", opacity: fieldName.trim() ? 1 : 0.5 }}>
                      Add field
                    </button>
                  </div>
                )}
              </section>

              <section style={sectionStyle(colors)}>
                <strong>Relations</strong>
                {relationRows.length === 0 && (
                  <div style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>No relations yet.</div>
                )}
                {relationRows.map((relation) => {
                  const otherId = relation.sourceEntityId === selected.id ? relation.targetEntityId : relation.sourceEntityId;
                  const other = model.entities.find((entity) => entity.id === otherId);
                  const [from, to] = cardinalityLabels(relation.cardinality);
                  return (
                    <div key={relation.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 14, background: colors.surface }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                        <strong>{other?.name ?? otherId}</strong>
                        <div style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{from} → {to}{relation.label ? ` · ${relation.label}` : ""}</div>
                      </div>
                      {!readOnly && (
                        <button type="button" onClick={() => commit(deleteDataRelation(model, relation.id))} style={{ ...buttonStyle(colors, "text"), minHeight: 32, padding: "4px 8px", color: colors.error }}>
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                {!readOnly && model.entities.length > 1 && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <select aria-label="Relation target" value={relationTargetId} onChange={(event) => setRelationTargetId(event.target.value)} style={controlStyle(colors)}>
                      <option value="">Connect to…</option>
                      {model.entities.filter((entity) => entity.id !== selected.id).map((entity) => (
                        <option key={entity.id} value={entity.id}>{entity.name}</option>
                      ))}
                    </select>
                    <select aria-label="Relation cardinality" value={cardinality} onChange={(event) => setCardinality(event.target.value as DataRelationCardinality)} style={controlStyle(colors)}>
                      {CARDINALITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <button type="button" onClick={addRelation} disabled={!relationTargetId} style={{ ...buttonStyle(colors), opacity: relationTargetId ? 1 : 0.5 }}>
                      Add relation
                    </button>
                  </div>
                )}
              </section>

              <section style={sectionStyle(colors)}>
                <div>
                  <strong>Used by</strong>
                  <div style={{ marginTop: 3, color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 1.4 }}>
                    Link this Entity to a Screen, Canvas part, Action or API. This is design metadata; it does not execute requests or change navigation.
                  </div>
                </div>
                {bindingsForSelected.length === 0 && (
                  <div style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>No cross-view bindings yet.</div>
                )}
                {bindingsForSelected.map((binding) => {
                  const subject = subjectByKey.get(subjectKey(binding.subject));
                  return (
                    <div key={binding.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 14, background: colors.surface }}>
                      <button
                        type="button"
                        disabled={!subject || !onOpenSubject}
                        onClick={() => { if (subject && onOpenSubject) onOpenSubject(subject); }}
                        style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: colors.onSurface, textAlign: "left", padding: 0, cursor: subject && onOpenSubject ? "pointer" : "default", font: "inherit" }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 750, color: colors.primary, textTransform: "uppercase" }}>{binding.subject.kind}</div>
                        <div style={{ fontSize: 13, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subject?.label ?? binding.subject.id}</div>
                        <div style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>{binding.access.join(" · ")}</div>
                      </button>
                      {!readOnly && (
                        <button type="button" aria-label="Delete binding" onClick={() => commit(deleteDataBinding(model, binding.id))} style={{ ...buttonStyle(colors, "text"), minHeight: 32, padding: "4px 8px", color: colors.error }}>
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                {!readOnly && subjects.length > 0 && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <select aria-label="Binding subject" value={bindingSubjectKey} onChange={(event) => setBindingSubjectKey(event.target.value)} style={controlStyle(colors)}>
                      <option value="">Link to…</option>
                      {subjects.map((subject) => (
                        <option key={subjectKey(subject)} value={subjectKey(subject)}>
                          {subject.kind.toUpperCase()} · {subject.label}{subject.detail ? ` · ${subject.detail}` : ""}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ACCESS_KINDS.map((option) => {
                        const on = bindingAccess.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleAccess(option.value)}
                            style={{ ...buttonStyle(colors, "text"), minHeight: 32, padding: "4px 10px", background: on ? colors.primaryContainer : "transparent", color: on ? colors.onPrimaryContainer : colors.onSurfaceVariant }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={addBinding} disabled={!bindingSubjectKey || bindingAccess.length === 0} style={{ ...buttonStyle(colors), opacity: bindingSubjectKey && bindingAccess.length ? 1 : 0.5 }}>
                      Add binding
                    </button>
                  </div>
                )}
              </section>

              <section style={sectionStyle(colors)}>
                <strong>Diagnostics</strong>
                {diagnostics.length === 0 ? (
                  <div style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>No Data Model problems found.</div>
                ) : (
                  diagnostics.map((diagnostic) => (
                    <button
                      key={diagnostic.id}
                      type="button"
                      onClick={() => { if (diagnostic.entityId) setSelectedEntityId(diagnostic.entityId); }}
                      style={{ border: `1px solid ${diagnostic.severity === "error" ? colors.error : colors.outlineVariant}`, borderRadius: 14, background: colors.surface, color: diagnostic.severity === "error" ? colors.error : colors.onSurface, padding: 10, textAlign: "left", font: "inherit", cursor: diagnostic.entityId ? "pointer" : "default" }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 750, textTransform: "uppercase" }}>{diagnostic.severity}</div>
                      <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.4 }}>{diagnostic.message}</div>
                    </button>
                  ))
                )}
              </section>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
