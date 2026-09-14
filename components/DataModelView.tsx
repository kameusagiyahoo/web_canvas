"use client";

import { useMemo, useState } from "react";
import {
  addDataEntity,
  addDataField,
  cardinalityLabels,
  connectDataEntities,
  deleteDataEntity,
  deleteDataField,
  deleteDataRelation,
  diagnoseDataModel,
  layoutDataModel,
  makeDataId,
  updateDataEntity,
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

const controlStyle = (colors: DataModelViewColors): React.CSSProperties => ({
  minHeight: 40,
  borderRadius: 12,
  border: `1px solid ${colors.outlineVariant}`,
  background: colors.surface,
  color: colors.onSurface,
  padding: "8px 10px",
  font: "inherit",
});

const buttonStyle = (
  colors: DataModelViewColors,
  variant: "filled" | "tonal" | "text" = "tonal",
): React.CSSProperties => ({
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
  fontWeight: 600,
  cursor: "pointer",
});

export function DataModelView({
  model,
  onChange,
  onClose,
  colors = DEFAULT_COLORS,
  readOnly = false,
}: {
  model: DataModel;
  onChange: (next: DataModel) => void;
  onClose?: () => void;
  colors?: DataModelViewColors;
  readOnly?: boolean;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(model.entities[0]?.id ?? null);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<DataFieldType>("string");
  const [relationTargetId, setRelationTargetId] = useState("");
  const [cardinality, setCardinality] = useState<DataRelationCardinality>("one-to-many");

  const layout = useMemo(() => layoutDataModel(model), [model]);
  const diagnostics = useMemo(() => diagnoseDataModel(model), [model]);
  const selected = model.entities.find((entity) => entity.id === selectedEntityId) ?? null;
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes]);
  const relationById = useMemo(
    () => new Map(model.relations.map((relation) => [relation.id, relation])),
    [model.relations],
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
          gap: 12,
          padding: "0 16px",
          borderBottom: `1px solid ${colors.outlineVariant}`,
          background: colors.surface,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Data model</div>
          <div style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
            {model.entities.length} entities · {model.relations.length} relations · {diagnostics.length} diagnostics
          </div>
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
          gridTemplateColumns: selected ? "minmax(0, 1fr) min(360px, 38vw)" : "minmax(0, 1fr)",
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
                <div style={{ fontSize: 22, fontWeight: 700, color: colors.onSurface }}>No entities yet</div>
                <p style={{ maxWidth: 440, lineHeight: 1.6 }}>
                  Add an entity to start describing the data that screens, actions and APIs will use.
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
                      <strong style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{entity.name}</strong>
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
                              gridTemplateColumns: "20px minmax(0, 1fr) auto",
                              alignItems: "center",
                              gap: 6,
                              padding: "0 14px",
                              fontSize: 13,
                            }}
                          >
                            <span aria-hidden="true" style={{ color: colors.primary, fontWeight: 700 }}>
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
              overflow: "auto",
              borderLeft: `1px solid ${colors.outlineVariant}`,
              background: colors.surface,
              padding: 18,
            }}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <section style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong>Entity</strong>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        commit(deleteDataEntity(model, selected.id));
                        setSelectedEntityId(model.entities.find((entity) => entity.id !== selected.id)?.id ?? null);
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
                  rows={3}
                  style={{ ...controlStyle(colors), resize: "vertical" }}
                />
              </section>

              <section style={{ display: "grid", gap: 8 }}>
                <strong>Fields</strong>
                {selected.fields.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto auto",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 14,
                      background: colors.surfaceContainer,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{field.name}</div>
                      <div style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                        {field.type}{field.primaryKey ? " · primary key" : ""}{field.required ? " · required" : ""}
                      </div>
                    </div>
                    {field.unique && <span style={{ fontSize: 11, color: colors.onSurfaceVariant }}>unique</span>}
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
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 118px auto", gap: 8 }}>
                    <input
                      aria-label="New field name"
                      value={fieldName}
                      onChange={(event) => setFieldName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addField();
                      }}
                      placeholder="field name"
                      style={controlStyle(colors)}
                    />
                    <select
                      aria-label="New field type"
                      value={fieldType}
                      onChange={(event) => setFieldType(event.target.value as DataFieldType)}
                      style={controlStyle(colors)}
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button type="button" onClick={addField} disabled={!fieldName.trim()} style={buttonStyle(colors)}>
                      Add
                    </button>
                  </div>
                )}
              </section>

              <section style={{ display: "grid", gap: 8 }}>
                <strong>Relations</strong>
                {model.relations
                  .filter((relation) => relation.sourceEntityId === selected.id || relation.targetEntityId === selected.id)
                  .map((relation) => {
                    const source = model.entities.find((entity) => entity.id === relation.sourceEntityId);
                    const target = model.entities.find((entity) => entity.id === relation.targetEntityId);
                    const [from, to] = cardinalityLabels(relation.cardinality);
                    return (
                      <div
                        key={relation.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) auto",
                          gap: 8,
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 14,
                          background: colors.surfaceContainer,
                        }}
                      >
                        <div style={{ minWidth: 0, fontSize: 13 }}>
                          <div>{source?.name ?? "Missing"} {from} → {to} {target?.name ?? "Missing"}</div>
                          {relation.label && <div style={{ color: colors.onSurfaceVariant }}>{relation.label}</div>}
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            aria-label="Delete relation"
                            onClick={() => commit(deleteDataRelation(model, relation.id))}
                            style={{ ...buttonStyle(colors, "text"), minHeight: 32, padding: "4px 8px", color: colors.error }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}

                {!readOnly && model.entities.length > 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(120px, 0.7fr) auto", gap: 8 }}>
                    <select
                      aria-label="Relation target"
                      value={relationTargetId}
                      onChange={(event) => setRelationTargetId(event.target.value)}
                      style={controlStyle(colors)}
                    >
                      <option value="">Target entity</option>
                      {model.entities
                        .filter((entity) => entity.id !== selected.id)
                        .map((entity) => (
                          <option key={entity.id} value={entity.id}>{entity.name}</option>
                        ))}
                    </select>
                    <select
                      aria-label="Relation cardinality"
                      value={cardinality}
                      onChange={(event) => setCardinality(event.target.value as DataRelationCardinality)}
                      style={controlStyle(colors)}
                    >
                      {CARDINALITIES.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={addRelation} disabled={!relationTargetId} style={buttonStyle(colors)}>
                      Link
                    </button>
                  </div>
                )}
              </section>

              {diagnostics.some((diagnostic) => diagnostic.entityId === selected.id) && (
                <section style={{ display: "grid", gap: 8 }}>
                  <strong>Diagnostics</strong>
                  {diagnostics
                    .filter((diagnostic) => diagnostic.entityId === selected.id)
                    .map((diagnostic) => (
                      <div
                        key={diagnostic.id}
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          background: colors.surfaceContainerHigh,
                          color: diagnostic.severity === "error" ? colors.error : colors.onSurfaceVariant,
                          fontSize: 13,
                        }}
                      >
                        {diagnostic.message}
                      </div>
                    ))}
                </section>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
