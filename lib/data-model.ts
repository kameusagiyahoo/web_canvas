export type DataFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "uuid"
  | "json"
  | "reference";

export type DataField = {
  id: string;
  name: string;
  type: DataFieldType;
  required?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  note?: string;
};

export type DataEntity = {
  id: string;
  name: string;
  note?: string;
  fields: DataField[];
};

export type DataRelationCardinality =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

export type DataRelation = {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  cardinality: DataRelationCardinality;
  label?: string;
  sourceFieldId?: string;
  targetFieldId?: string;
};

export type DataBindingSubjectKind = "frame" | "item" | "action" | "api";
export type DataAccessKind = "read" | "create" | "update" | "delete";

export type DataBinding = {
  id: string;
  subject: {
    kind: DataBindingSubjectKind;
    id: string;
  };
  entityId: string;
  access: DataAccessKind[];
  note?: string;
};

export type DataModel = {
  version: 1;
  entities: DataEntity[];
  relations: DataRelation[];
  bindings: DataBinding[];
};

export type DataDiagnosticKind =
  | "duplicate-entity-name"
  | "missing-relation-entity"
  | "missing-relation-field"
  | "missing-binding-entity"
  | "empty-entity";

export type DataDiagnostic = {
  id: string;
  kind: DataDiagnosticKind;
  severity: "warning" | "error";
  entityId?: string;
  relationId?: string;
  bindingId?: string;
  message: string;
};

export type DataLayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DataLayoutEdge = {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type DataGraphLayout = {
  width: number;
  height: number;
  nodes: DataLayoutNode[];
  edges: DataLayoutEdge[];
};

const ENTITY_WIDTH = 260;
const ENTITY_HEADER_HEIGHT = 52;
const FIELD_ROW_HEIGHT = 32;
const ENTITY_MIN_HEIGHT = 96;
const COLUMN_GAP = 180;
const ROW_GAP = 64;
const CANVAS_PADDING = 72;

const trimmed = (value: string | undefined) => value?.trim() || undefined;
const cleanId = (value: string) => value.trim();

const normalizedField = (field: DataField): DataField => ({
  ...field,
  id: cleanId(field.id),
  name: field.name.trim(),
  note: trimmed(field.note),
});

const normalizedEntity = (entity: DataEntity): DataEntity => ({
  ...entity,
  id: cleanId(entity.id),
  name: entity.name.trim(),
  note: trimmed(entity.note),
  fields: entity.fields.map(normalizedField),
});

const normalizedRelation = (relation: DataRelation): DataRelation => ({
  ...relation,
  id: cleanId(relation.id),
  sourceEntityId: cleanId(relation.sourceEntityId),
  targetEntityId: cleanId(relation.targetEntityId),
  sourceFieldId: trimmed(relation.sourceFieldId),
  targetFieldId: trimmed(relation.targetFieldId),
  label: trimmed(relation.label),
});

const uniqueAccess = (access: DataAccessKind[]) => [...new Set(access)];

const normalizedBinding = (binding: DataBinding): DataBinding => ({
  ...binding,
  id: cleanId(binding.id),
  subject: {
    ...binding.subject,
    id: cleanId(binding.subject.id),
  },
  entityId: cleanId(binding.entityId),
  access: uniqueAccess(binding.access),
  note: trimmed(binding.note),
});

export const emptyDataModel = (): DataModel => ({
  version: 1,
  entities: [],
  relations: [],
  bindings: [],
});

export const makeDataId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export function addDataEntity(model: DataModel, entity: DataEntity): DataModel {
  const next = normalizedEntity(entity);
  if (!next.id || !next.name) return model;
  if (model.entities.some((item) => item.id === next.id)) return model;
  return { ...model, entities: [...model.entities, next] };
}

export function updateDataEntity(
  model: DataModel,
  entityId: string,
  patch: Partial<Pick<DataEntity, "name" | "note">>,
): DataModel {
  const id = cleanId(entityId);
  const current = model.entities.find((entity) => entity.id === id);
  if (!current) return model;
  const nextName = patch.name === undefined ? current.name : patch.name.trim();
  if (!nextName) return model;
  const entities = model.entities.map((entity) =>
    entity.id === id
      ? { ...entity, ...patch, name: nextName, note: patch.note === undefined ? entity.note : trimmed(patch.note) }
      : entity,
  );
  return { ...model, entities };
}

export function deleteDataEntity(model: DataModel, entityId: string): DataModel {
  const id = cleanId(entityId);
  if (!model.entities.some((entity) => entity.id === id)) return model;
  return {
    ...model,
    entities: model.entities.filter((entity) => entity.id !== id),
    relations: model.relations.filter(
      (relation) => relation.sourceEntityId !== id && relation.targetEntityId !== id,
    ),
    bindings: model.bindings.filter((binding) => binding.entityId !== id),
  };
}

export function addDataField(model: DataModel, entityId: string, field: DataField): DataModel {
  const id = cleanId(entityId);
  const next = normalizedField(field);
  if (!next.id || !next.name) return model;
  const owner = model.entities.find((entity) => entity.id === id);
  if (!owner || owner.fields.some((item) => item.id === next.id)) return model;
  return {
    ...model,
    entities: model.entities.map((entity) =>
      entity.id === id ? { ...entity, fields: [...entity.fields, next] } : entity,
    ),
  };
}

export function updateDataField(
  model: DataModel,
  entityId: string,
  fieldId: string,
  patch: Partial<Omit<DataField, "id">>,
): DataModel {
  const ownerId = cleanId(entityId);
  const id = cleanId(fieldId);
  const owner = model.entities.find((entity) => entity.id === ownerId);
  const current = owner?.fields.find((field) => field.id === id);
  if (!owner || !current) return model;
  const nextName = patch.name === undefined ? current.name : patch.name.trim();
  if (!nextName) return model;
  return {
    ...model,
    entities: model.entities.map((entity) =>
      entity.id === ownerId
        ? {
            ...entity,
            fields: entity.fields.map((field) =>
              field.id === id
                ? {
                    ...field,
                    ...patch,
                    name: nextName,
                    note: patch.note === undefined ? field.note : trimmed(patch.note),
                  }
                : field,
            ),
          }
        : entity,
    ),
  };
}

export function deleteDataField(model: DataModel, entityId: string, fieldId: string): DataModel {
  const ownerId = cleanId(entityId);
  const id = cleanId(fieldId);
  const owner = model.entities.find((entity) => entity.id === ownerId);
  if (!owner?.fields.some((field) => field.id === id)) return model;
  return {
    ...model,
    entities: model.entities.map((entity) =>
      entity.id === ownerId
        ? { ...entity, fields: entity.fields.filter((field) => field.id !== id) }
        : entity,
    ),
    relations: model.relations.map((relation) => ({
      ...relation,
      sourceFieldId:
        relation.sourceEntityId === ownerId && relation.sourceFieldId === id
          ? undefined
          : relation.sourceFieldId,
      targetFieldId:
        relation.targetEntityId === ownerId && relation.targetFieldId === id
          ? undefined
          : relation.targetFieldId,
    })),
  };
}

const hasEntity = (model: DataModel, id: string) =>
  model.entities.some((entity) => entity.id === id);

const hasField = (model: DataModel, entityId: string, fieldId: string | undefined) =>
  !fieldId ||
  model.entities
    .find((entity) => entity.id === entityId)
    ?.fields.some((field) => field.id === fieldId) === true;

export function connectDataEntities(model: DataModel, relation: DataRelation): DataModel {
  const next = normalizedRelation(relation);
  if (!next.id || !hasEntity(model, next.sourceEntityId) || !hasEntity(model, next.targetEntityId)) {
    return model;
  }
  if (model.relations.some((item) => item.id === next.id)) return model;
  if (!hasField(model, next.sourceEntityId, next.sourceFieldId)) return model;
  if (!hasField(model, next.targetEntityId, next.targetFieldId)) return model;
  const duplicate = model.relations.some(
    (item) =>
      item.sourceEntityId === next.sourceEntityId &&
      item.targetEntityId === next.targetEntityId &&
      item.cardinality === next.cardinality &&
      item.sourceFieldId === next.sourceFieldId &&
      item.targetFieldId === next.targetFieldId,
  );
  if (duplicate) return model;
  return { ...model, relations: [...model.relations, next] };
}

export function updateDataRelation(
  model: DataModel,
  relationId: string,
  patch: Partial<Omit<DataRelation, "id">>,
): DataModel {
  const id = cleanId(relationId);
  const current = model.relations.find((relation) => relation.id === id);
  if (!current) return model;
  const next = normalizedRelation({ ...current, ...patch, id });
  if (!hasEntity(model, next.sourceEntityId) || !hasEntity(model, next.targetEntityId)) return model;
  if (!hasField(model, next.sourceEntityId, next.sourceFieldId)) return model;
  if (!hasField(model, next.targetEntityId, next.targetFieldId)) return model;
  return {
    ...model,
    relations: model.relations.map((relation) => (relation.id === id ? next : relation)),
  };
}

export function deleteDataRelation(model: DataModel, relationId: string): DataModel {
  const id = cleanId(relationId);
  if (!model.relations.some((relation) => relation.id === id)) return model;
  return { ...model, relations: model.relations.filter((relation) => relation.id !== id) };
}

export function addDataBinding(model: DataModel, binding: DataBinding): DataModel {
  const next = normalizedBinding(binding);
  if (!next.id || !next.subject.id || !hasEntity(model, next.entityId) || next.access.length === 0) {
    return model;
  }
  if (model.bindings.some((item) => item.id === next.id)) return model;
  const duplicate = model.bindings.some(
    (item) =>
      item.subject.kind === next.subject.kind &&
      item.subject.id === next.subject.id &&
      item.entityId === next.entityId,
  );
  if (duplicate) return model;
  return { ...model, bindings: [...model.bindings, next] };
}

export function updateDataBinding(
  model: DataModel,
  bindingId: string,
  patch: Partial<Omit<DataBinding, "id">>,
): DataModel {
  const id = cleanId(bindingId);
  const current = model.bindings.find((binding) => binding.id === id);
  if (!current) return model;
  const next = normalizedBinding({ ...current, ...patch, id });
  if (!next.subject.id || !hasEntity(model, next.entityId) || next.access.length === 0) return model;
  return {
    ...model,
    bindings: model.bindings.map((binding) => (binding.id === id ? next : binding)),
  };
}

export function deleteDataBinding(model: DataModel, bindingId: string): DataModel {
  const id = cleanId(bindingId);
  if (!model.bindings.some((binding) => binding.id === id)) return model;
  return { ...model, bindings: model.bindings.filter((binding) => binding.id !== id) };
}

export function diagnoseDataModel(model: DataModel): DataDiagnostic[] {
  const diagnostics: DataDiagnostic[] = [];
  const names = new Map<string, string[]>();

  for (const entity of model.entities) {
    const key = entity.name.trim().toLocaleLowerCase();
    if (key) names.set(key, [...(names.get(key) ?? []), entity.id]);
    if (entity.fields.length === 0) {
      diagnostics.push({
        id: `empty:${entity.id}`,
        kind: "empty-entity",
        severity: "warning",
        entityId: entity.id,
        message: `${entity.name} has no fields.`,
      });
    }
  }

  for (const [name, ids] of names) {
    if (ids.length < 2) continue;
    for (const entityId of ids) {
      diagnostics.push({
        id: `duplicate-name:${entityId}`,
        kind: "duplicate-entity-name",
        severity: "warning",
        entityId,
        message: `Entity name “${name}” is used more than once.`,
      });
    }
  }

  for (const relation of model.relations) {
    const source = model.entities.find((entity) => entity.id === relation.sourceEntityId);
    const target = model.entities.find((entity) => entity.id === relation.targetEntityId);
    if (!source || !target) {
      diagnostics.push({
        id: `missing-relation-entity:${relation.id}`,
        kind: "missing-relation-entity",
        severity: "error",
        relationId: relation.id,
        message: `Relation ${relation.id} references a missing entity.`,
      });
      continue;
    }
    if (relation.sourceFieldId && !source.fields.some((field) => field.id === relation.sourceFieldId)) {
      diagnostics.push({
        id: `missing-source-field:${relation.id}`,
        kind: "missing-relation-field",
        severity: "error",
        relationId: relation.id,
        message: `Relation ${relation.id} references a missing source field.`,
      });
    }
    if (relation.targetFieldId && !target.fields.some((field) => field.id === relation.targetFieldId)) {
      diagnostics.push({
        id: `missing-target-field:${relation.id}`,
        kind: "missing-relation-field",
        severity: "error",
        relationId: relation.id,
        message: `Relation ${relation.id} references a missing target field.`,
      });
    }
  }

  for (const binding of model.bindings) {
    if (!hasEntity(model, binding.entityId)) {
      diagnostics.push({
        id: `missing-binding-entity:${binding.id}`,
        kind: "missing-binding-entity",
        severity: "error",
        bindingId: binding.id,
        message: `Binding ${binding.id} references a missing entity.`,
      });
    }
  }

  return diagnostics;
}

function computeDepths(model: DataModel): Map<string, number> {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const entity of model.entities) {
    incoming.set(entity.id, 0);
    outgoing.set(entity.id, []);
  }
  for (const relation of model.relations) {
    if (!incoming.has(relation.sourceEntityId) || !incoming.has(relation.targetEntityId)) continue;
    if (relation.sourceEntityId === relation.targetEntityId) continue;
    incoming.set(relation.targetEntityId, (incoming.get(relation.targetEntityId) ?? 0) + 1);
    outgoing.set(relation.sourceEntityId, [
      ...(outgoing.get(relation.sourceEntityId) ?? []),
      relation.targetEntityId,
    ]);
  }

  const depth = new Map<string, number>();
  const queue = model.entities.filter((entity) => (incoming.get(entity.id) ?? 0) === 0).map((entity) => entity.id);
  for (const id of queue) depth.set(id, 0);

  let cursor = 0;
  while (cursor < queue.length) {
    const id = queue[cursor++];
    const currentDepth = depth.get(id) ?? 0;
    for (const next of outgoing.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, currentDepth + 1));
      incoming.set(next, (incoming.get(next) ?? 1) - 1);
      if ((incoming.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  const maxDepth = Math.max(0, ...depth.values());
  for (const entity of model.entities) {
    if (!depth.has(entity.id)) depth.set(entity.id, maxDepth + 1);
  }
  return depth;
}

export function layoutDataModel(model: DataModel): DataGraphLayout {
  if (model.entities.length === 0) {
    return { width: 640, height: 360, nodes: [], edges: [] };
  }

  const depths = computeDepths(model);
  const columns = new Map<number, DataEntity[]>();
  for (const entity of model.entities) {
    const column = depths.get(entity.id) ?? 0;
    columns.set(column, [...(columns.get(column) ?? []), entity]);
  }

  const nodes: DataLayoutNode[] = [];
  for (const [column, entities] of [...columns.entries()].sort(([a], [b]) => a - b)) {
    let y = CANVAS_PADDING;
    for (const entity of entities) {
      const height = Math.max(
        ENTITY_MIN_HEIGHT,
        ENTITY_HEADER_HEIGHT + Math.max(1, entity.fields.length) * FIELD_ROW_HEIGHT + 16,
      );
      nodes.push({
        id: entity.id,
        x: CANVAS_PADDING + column * (ENTITY_WIDTH + COLUMN_GAP),
        y,
        width: ENTITY_WIDTH,
        height,
      });
      y += height + ROW_GAP;
    }
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = model.relations.flatMap<DataLayoutEdge>((relation) => {
    const source = nodeById.get(relation.sourceEntityId);
    const target = nodeById.get(relation.targetEntityId);
    if (!source || !target) return [];
    const sourceOnLeft = source.x <= target.x;
    return [
      {
        id: relation.id,
        sourceEntityId: relation.sourceEntityId,
        targetEntityId: relation.targetEntityId,
        x1: sourceOnLeft ? source.x + source.width : source.x,
        y1: source.y + source.height / 2,
        x2: sourceOnLeft ? target.x : target.x + target.width,
        y2: target.y + target.height / 2,
      },
    ];
  });

  const right = Math.max(...nodes.map((node) => node.x + node.width)) + CANVAS_PADDING;
  const bottom = Math.max(...nodes.map((node) => node.y + node.height)) + CANVAS_PADDING;
  return { width: Math.max(640, right), height: Math.max(360, bottom), nodes, edges };
}

export function cardinalityLabels(cardinality: DataRelationCardinality): [string, string] {
  switch (cardinality) {
    case "one-to-one":
      return ["1", "1"];
    case "one-to-many":
      return ["1", "*"];
    case "many-to-one":
      return ["*", "1"];
    case "many-to-many":
      return ["*", "*"];
  }
}
