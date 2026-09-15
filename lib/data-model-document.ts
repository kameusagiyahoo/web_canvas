import type { Doc } from "./tokens";
import type {
  DataAccessKind,
  DataBindingSubjectKind,
  DataFieldType,
  DataModel,
  DataRelationCardinality,
} from "./data-model";

/**
 * Transitional document shape while Data Model remains an optional additive
 * capability. Keeping the field optional means every existing project remains
 * valid and opens with an empty Data Model.
 */
export type DataModelDocument = Doc & { dataModel?: DataModel };

const FIELD_TYPES = new Set<DataFieldType>([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "uuid",
  "json",
  "reference",
]);
const CARDINALITIES = new Set<DataRelationCardinality>([
  "one-to-one",
  "one-to-many",
  "many-to-one",
  "many-to-many",
]);
const SUBJECT_KINDS = new Set<DataBindingSubjectKind>([
  "frame",
  "item",
  "action",
  "api",
]);
const ACCESS_KINDS = new Set<DataAccessKind>([
  "read",
  "create",
  "update",
  "delete",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const optionalString = (value: unknown) =>
  value === undefined || typeof value === "string";
const optionalBoolean = (value: unknown) =>
  value === undefined || typeof value === "boolean";

const validField = (value: unknown) =>
  isRecord(value) &&
  nonEmptyString(value.id) &&
  nonEmptyString(value.name) &&
  typeof value.type === "string" &&
  FIELD_TYPES.has(value.type as DataFieldType) &&
  optionalBoolean(value.required) &&
  optionalBoolean(value.primaryKey) &&
  optionalBoolean(value.unique) &&
  optionalString(value.note);

const validEntity = (value: unknown) =>
  isRecord(value) &&
  nonEmptyString(value.id) &&
  nonEmptyString(value.name) &&
  optionalString(value.note) &&
  Array.isArray(value.fields) &&
  value.fields.every(validField);

const validRelation = (value: unknown) =>
  isRecord(value) &&
  nonEmptyString(value.id) &&
  nonEmptyString(value.sourceEntityId) &&
  nonEmptyString(value.targetEntityId) &&
  typeof value.cardinality === "string" &&
  CARDINALITIES.has(value.cardinality as DataRelationCardinality) &&
  optionalString(value.label) &&
  (value.sourceFieldId === undefined || nonEmptyString(value.sourceFieldId)) &&
  (value.targetFieldId === undefined || nonEmptyString(value.targetFieldId));

const validBinding = (value: unknown) =>
  isRecord(value) &&
  nonEmptyString(value.id) &&
  isRecord(value.subject) &&
  typeof value.subject.kind === "string" &&
  SUBJECT_KINDS.has(value.subject.kind as DataBindingSubjectKind) &&
  nonEmptyString(value.subject.id) &&
  nonEmptyString(value.entityId) &&
  Array.isArray(value.access) &&
  value.access.length > 0 &&
  value.access.every(
    (access) => typeof access === "string" && ACCESS_KINDS.has(access as DataAccessKind),
  ) &&
  optionalString(value.note);

/** Strictly validates the persisted Data Model boundary before it reaches React state. */
export function isDataModel(value: unknown): value is DataModel {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.entities) &&
    value.entities.every(validEntity) &&
    Array.isArray(value.relations) &&
    value.relations.every(validRelation) &&
    Array.isArray(value.bindings) &&
    value.bindings.every(validBinding)
  );
}

/** Reads an optional Data Model from an unknown/legacy document without guessing. */
export function dataModelFromDocument(value: unknown): DataModel | undefined {
  if (!isRecord(value) || value.dataModel === undefined) return undefined;
  return isDataModel(value.dataModel) ? value.dataModel : undefined;
}
