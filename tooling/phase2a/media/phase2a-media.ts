#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_MATERIALS_PATH = '.local/phase-2a-migration/transform/materials.json';
const DEFAULT_SOURCE_MANIFEST_PATH = '.local/phase-2a-migration/source/media-manifest.csv';
const DEFAULT_EXCLUSIONS_PATH = '.local/phase-2a-migration/transform/category-exclusions.json';
const DEFAULT_WORK_DIR = '.local/phase-2a-migration/media';
const DEFAULT_BUCKET = 'catalog';
const DEFAULT_MAX_SIDE = 1_600;
const DEFAULT_WEBP_QUALITY = 80;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_EXPECTED_EXCLUSIONS = 5;
const STANDARD_UPLOAD_LIMIT_BYTES = 6 * 1_024 * 1_024;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const APPROVED_RIGHTS = new Set(['PARTNER_LICENSE', 'OWNER_CREATED', 'LICENSED']);
const APPROVED_PUBLICATION_STATUS = 'PUBLICATION_APPROVED';

type JsonObject = { [key: string]: JsonValue };
type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string;
type Mode = 'optimize' | 'upload' | 'verify';

export class MediaPipelineError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'MediaPipelineError';
  }
}

interface CliOptions {
  bucket: string;
  concurrency: number;
  exclusionsPath: string;
  expectedExclusions: number;
  legacyRoot?: string;
  materialsPath: string;
  maxSide: number;
  mode: Mode;
  remote: boolean;
  repoRoot: string;
  sourceManifestPath: string;
  webpQuality: number;
  workDir: string;
}

interface PrimaryMedia {
  byteSize: number;
  fileHash: string;
  height: number;
  mimeType: string;
  objectKey: string;
  publicationStatus: string;
  rightsStatus: string;
  sourceId?: string;
  sourceUrl?: string;
  width: number;
}

interface TransformMaterial {
  categoryLegacySourceId: string;
  legacyId?: string;
  legacySourceId: string;
  primaryMedia: null | PrimaryMedia;
}

interface SourceMediaRecord extends PrimaryMedia {
  activePrimary: boolean;
}

interface CategoryExclusion {
  categoryCount: number;
  descendantCategoryLegacyIds: string[];
  distinctPrimaryMediaCount: number;
  legacyId: string;
  materialCount: number;
  name: string;
  ownerLabel: string;
  primaryMediaBytes: number;
  sourceId: string;
  sourceSlug: string;
}

interface ExclusionTotals {
  categoryCount: number;
  distinctPrimaryMediaCount: number;
  materialCount: number;
  primaryMediaBytes: number;
}

interface CategoryExclusionsDocument {
  exclusions: CategoryExclusion[];
  reason: 'OWNER_EXCLUDED_NOT_OFFERED';
  sourceCatalogVersionId: string;
  totals: ExclusionTotals;
}

interface SharpMetadata {
  exif?: Buffer;
  format?: string;
  height?: number;
  icc?: Buffer;
  pages?: number;
  width?: number;
  xmp?: Buffer;
}

interface SharpResult {
  data: Buffer;
  info: {
    format: string;
    height: number;
    size: number;
    width: number;
  };
}

interface SharpInstance {
  metadata(): Promise<SharpMetadata>;
  resize(options: {
    fit: 'inside';
    height: number;
    kernel: 'lanczos3';
    width: number;
    withoutEnlargement: true;
  }): SharpInstance;
  rotate(): SharpInstance;
  toBuffer(options: { resolveWithObject: true }): Promise<SharpResult>;
  webp(options: { effort: number; quality: number; smartSubsample: true }): SharpInstance;
}

interface SharpFactory {
  (
    input: Buffer,
    options?: {
      animated: false;
      failOn: 'error';
      limitInputPixels: number;
    },
  ): SharpInstance;
}

interface OptimizedSource {
  localRelativePath: string;
  optimizedByteSize: number;
  optimizedHash: string;
  optimizedHeight: number;
  optimizedWidth: number;
  source: PrimaryMedia;
  storagePath: string;
}

interface MaterialManifestRecord {
  categoryLegacySourceId: string;
  legacyId?: string;
  legacySourceId: string;
  localRelativePath: string;
  optimizedByteSize: number;
  optimizedHash: string;
  optimizedHeight: number;
  optimizedWidth: number;
  sourceByteSize: number;
  sourceFileHash: string;
  sourceHeight: number;
  sourceMimeType: string;
  sourceObjectKey: string;
  sourceWidth: number;
  storagePath: string;
}

interface ObjectManifestRecord {
  byteSize: number;
  height: number;
  legacySourceIds: string[];
  localRelativePath: string;
  materialCount: number;
  sha256: string;
  storagePath: string;
  width: number;
}

interface DeferredMaterialRecord {
  categoryLegacySourceId: string;
  declaredPrimaryMediaBytes: number;
  legacyId?: string;
  legacySourceId: string;
  reason: 'NO_PRIMARY_MEDIA' | 'PUBLICATION_NOT_APPROVED' | 'RIGHTS_NOT_APPROVED';
  sourceFileHash?: string;
  sourceObjectKey?: string;
}

interface InputFingerprint {
  path: string;
  sha256: string;
}

interface UploadManifestPayload extends JsonObject {
  counts: JsonObject;
  inputs: JsonObject;
  materials: JsonValue[];
  objects: JsonValue[];
  policy: JsonObject;
  schemaVersion: number;
}

interface DeferredManifestPayload extends JsonObject {
  counts: JsonObject;
  deferredMaterials: JsonValue[];
  inputs: JsonObject;
  ownerExclusions: JsonObject;
  schemaVersion: number;
}

interface ChecksummedDocument extends JsonObject {
  manifestChecksumSha256: string;
}

interface BuildResult {
  createdObjectCount: number;
  deferredManifest: ChecksummedDocument;
  deferredManifestChanged: boolean;
  manifest: ChecksummedDocument;
  manifestChanged: boolean;
  reusedObjectCount: number;
}

export interface MediaPipelineSummary extends JsonObject {
  mode: Mode;
  ok: true;
}

interface LegacyObjectSource {
  close(): void;
  readObject(objectKey: string, expectedBytes: number): Promise<Buffer>;
}

function fail(message: string): never {
  throw new MediaPipelineError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && error['code'] === code;
}

function requiredString(
  value: unknown,
  field: string,
  options: { allowEmpty?: boolean } = {},
): string {
  if (typeof value !== 'string' || (!options.allowEmpty && value.trim().length === 0)) {
    fail(`${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requiredString(value, field);
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail(`${field} must be a non-negative safe integer`);
  }
  return value as number;
}

function positiveInteger(value: unknown, field: string): number {
  const integer = nonNegativeInteger(value, field);
  if (integer === 0) {
    fail(`${field} must be greater than zero`);
  }
  return integer;
}

export function normalizeSha256(value: unknown, field: string): string {
  const hash = requiredString(value, field).toLowerCase();
  if (!HASH_PATTERN.test(hash)) {
    fail(`${field} must be a 64-character SHA-256 hex digest`);
  }
  return hash;
}

function normalizeMimeType(value: unknown, field: string): string {
  const mimeType = requiredString(value, field).toLowerCase();
  if (!/^image\/[a-z0-9.+-]+$/u.test(mimeType)) {
    fail(`${field} must be an image MIME type`);
  }
  return mimeType;
}

export function normalizeStorageObjectKey(value: unknown, field: string): string {
  const objectKey = requiredString(value, field);
  if (
    objectKey.includes('\\') ||
    objectKey.includes('\0') ||
    objectKey.startsWith('/') ||
    /^[a-zA-Z]:/u.test(objectKey)
  ) {
    fail(`${field} is not a safe storage object key`);
  }
  const segments = objectKey.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    fail(`${field} is not a safe storage object key`);
  }
  return segments.join('/');
}

function parsePrimaryMedia(value: unknown, field: string): null | PrimaryMedia {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    fail(`${field} must be an object or null`);
  }
  const sourceId = optionalString(value['sourceId'], `${field}.sourceId`);
  const sourceUrl = optionalString(value['sourceUrl'], `${field}.sourceUrl`);
  return {
    byteSize: positiveInteger(value['byteSize'], `${field}.byteSize`),
    fileHash: normalizeSha256(value['fileHash'], `${field}.fileHash`),
    height: positiveInteger(value['height'], `${field}.height`),
    mimeType: normalizeMimeType(value['mimeType'], `${field}.mimeType`),
    objectKey: normalizeStorageObjectKey(value['objectKey'], `${field}.objectKey`),
    publicationStatus: requiredString(value['publicationStatus'], `${field}.publicationStatus`),
    rightsStatus: requiredString(value['rightsStatus'], `${field}.rightsStatus`),
    ...(sourceId === undefined ? {} : { sourceId }),
    ...(sourceUrl === undefined ? {} : { sourceUrl }),
    width: positiveInteger(value['width'], `${field}.width`),
  };
}

export function parseMaterialsDocument(value: unknown): TransformMaterial[] {
  let rawMaterials: unknown[];
  if (Array.isArray(value)) {
    rawMaterials = value;
  } else if (isRecord(value) && Array.isArray(value['materials'])) {
    rawMaterials = value['materials'];
  } else {
    fail('materials document must be an array or an object with a materials array');
  }

  const materials = rawMaterials.map((raw, index): TransformMaterial => {
    if (!isRecord(raw)) {
      fail(`materials[${index}] must be an object`);
    }
    const canonicalMedia = raw['primaryMedia'];
    const aliasMedia = raw['primaryImageSource'];
    if (canonicalMedia !== undefined && aliasMedia !== undefined) {
      fail(`materials[${index}] cannot contain both primaryMedia and primaryImageSource`);
    }
    if (canonicalMedia === undefined && aliasMedia === undefined) {
      fail(`materials[${index}].primaryMedia is required (null is allowed)`);
    }
    const legacyId = optionalString(raw['legacyId'], `materials[${index}].legacyId`);
    return {
      categoryLegacySourceId: requiredString(
        raw['categoryLegacySourceId'],
        `materials[${index}].categoryLegacySourceId`,
      ),
      ...(legacyId === undefined ? {} : { legacyId }),
      legacySourceId: requiredString(raw['legacySourceId'], `materials[${index}].legacySourceId`),
      primaryMedia: parsePrimaryMedia(
        canonicalMedia === undefined ? aliasMedia : canonicalMedia,
        `materials[${index}].primaryMedia`,
      ),
    };
  });

  for (let index = 0; index < materials.length; index += 1) {
    const current = materials[index];
    const previous = materials[index - 1];
    if (current === undefined) {
      fail('materials parser produced an invalid sparse array');
    }
    if (previous !== undefined && previous.legacySourceId >= current.legacySourceId) {
      fail('materials must be uniquely sorted by legacySourceId');
    }
  }
  return materials;
}

function parseExclusionEntry(value: unknown, index: number): CategoryExclusion {
  if (!isRecord(value)) {
    fail(`category exclusions[${index}] must be an object`);
  }
  if (!Array.isArray(value['descendantCategoryLegacyIds'])) {
    fail(`category exclusions[${index}].descendantCategoryLegacyIds must be an array`);
  }
  const descendants = value['descendantCategoryLegacyIds'].map((entry, descendantIndex) =>
    requiredString(
      entry,
      `category exclusions[${index}].descendantCategoryLegacyIds[${descendantIndex}]`,
    ),
  );
  const sortedDescendants = [...descendants].sort(compareText);
  if (JSON.stringify(descendants) !== JSON.stringify(sortedDescendants)) {
    fail(`category exclusions[${index}].descendantCategoryLegacyIds must be sorted`);
  }
  if (new Set(descendants).size !== descendants.length) {
    fail(`category exclusions[${index}].descendantCategoryLegacyIds contains duplicates`);
  }
  return {
    categoryCount: nonNegativeInteger(
      value['categoryCount'],
      `category exclusions[${index}].categoryCount`,
    ),
    descendantCategoryLegacyIds: descendants,
    distinctPrimaryMediaCount: nonNegativeInteger(
      value['distinctPrimaryMediaCount'],
      `category exclusions[${index}].distinctPrimaryMediaCount`,
    ),
    legacyId: requiredString(value['legacyId'], `category exclusions[${index}].legacyId`),
    materialCount: nonNegativeInteger(
      value['materialCount'],
      `category exclusions[${index}].materialCount`,
    ),
    name: requiredString(value['name'], `category exclusions[${index}].name`),
    ownerLabel: requiredString(value['ownerLabel'], `category exclusions[${index}].ownerLabel`),
    primaryMediaBytes: nonNegativeInteger(
      value['primaryMediaBytes'],
      `category exclusions[${index}].primaryMediaBytes`,
    ),
    sourceId: requiredString(value['sourceId'], `category exclusions[${index}].sourceId`),
    sourceSlug: requiredString(value['sourceSlug'], `category exclusions[${index}].sourceSlug`),
  };
}

export function parseCategoryExclusionsDocument(
  value: unknown,
  expectedExclusions = DEFAULT_EXPECTED_EXCLUSIONS,
): CategoryExclusionsDocument {
  if (!isRecord(value)) {
    fail('category exclusions document must be an object');
  }
  if (value['reason'] !== 'OWNER_EXCLUDED_NOT_OFFERED') {
    fail('category exclusions reason must be OWNER_EXCLUDED_NOT_OFFERED');
  }
  if (!Array.isArray(value['exclusions'])) {
    fail('category exclusions document must contain an exclusions array');
  }
  if (value['exclusions'].length !== expectedExclusions) {
    fail(`category exclusions must contain exactly ${expectedExclusions} owner exclusions`);
  }
  const exclusions = value['exclusions'].map(parseExclusionEntry);
  for (let index = 1; index < exclusions.length; index += 1) {
    const previous = exclusions[index - 1];
    const current = exclusions[index];
    if (previous === undefined || current === undefined || previous.sourceId >= current.sourceId) {
      fail('category exclusions must be uniquely sorted by sourceId');
    }
  }
  if (!isRecord(value['totals'])) {
    fail('category exclusions totals must be an object');
  }
  const totals: ExclusionTotals = {
    categoryCount: nonNegativeInteger(
      value['totals']['categoryCount'],
      'exclusion totals.categoryCount',
    ),
    distinctPrimaryMediaCount: nonNegativeInteger(
      value['totals']['distinctPrimaryMediaCount'],
      'exclusion totals.distinctPrimaryMediaCount',
    ),
    materialCount: nonNegativeInteger(
      value['totals']['materialCount'],
      'exclusion totals.materialCount',
    ),
    primaryMediaBytes: nonNegativeInteger(
      value['totals']['primaryMediaBytes'],
      'exclusion totals.primaryMediaBytes',
    ),
  };
  const summed = exclusions.reduce<ExclusionTotals>(
    (sum, exclusion) => ({
      categoryCount: sum.categoryCount + exclusion.categoryCount,
      distinctPrimaryMediaCount:
        sum.distinctPrimaryMediaCount + exclusion.distinctPrimaryMediaCount,
      materialCount: sum.materialCount + exclusion.materialCount,
      primaryMediaBytes: sum.primaryMediaBytes + exclusion.primaryMediaBytes,
    }),
    {
      categoryCount: 0,
      distinctPrimaryMediaCount: 0,
      materialCount: 0,
      primaryMediaBytes: 0,
    },
  );
  if (canonicalStringify(summed) !== canonicalStringify(totals)) {
    fail('category exclusions totals do not equal the sum of exclusion entries');
  }

  const allCategoryIds = exclusions.flatMap((exclusion) => [
    exclusion.legacyId,
    ...exclusion.descendantCategoryLegacyIds,
  ]);
  if (new Set(allCategoryIds).size !== allCategoryIds.length) {
    fail('category exclusions contain overlapping legacy category IDs');
  }

  return {
    exclusions,
    reason: 'OWNER_EXCLUDED_NOT_OFFERED',
    sourceCatalogVersionId: requiredString(
      value['sourceCatalogVersionId'],
      'category exclusions.sourceCatalogVersionId',
    ),
    totals,
  };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === undefined) {
      continue;
    }
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field.length > 0) {
        fail('invalid CSV quote placement');
      }
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      rows.push(row);
      field = '';
      row = [];
    } else {
      field += character;
    }
  }
  if (quoted) {
    fail('unterminated quoted CSV field');
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows.filter((columns) => columns.some((column) => column.length > 0));
}

function parseBoolean(value: string, field: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['1', 't', 'true', 'yes'].includes(normalized)) {
    return true;
  }
  if (['0', 'f', 'false', 'no'].includes(normalized)) {
    return false;
  }
  fail(`${field} must be a boolean`);
}

function parseSourceManifest(text: string): Map<string, SourceMediaRecord> {
  const rows = parseCsv(text);
  const header = rows.shift();
  const expectedHeader = [
    'object_key',
    'file_hash',
    'byte_size',
    'mime_type',
    'width',
    'height',
    'rights_status',
    'publication_status',
    'active_primary',
  ];
  if (canonicalStringify(header ?? []) !== canonicalStringify(expectedHeader)) {
    fail(`source media manifest header must be ${expectedHeader.join(',')}`);
  }
  const records = new Map<string, SourceMediaRecord>();
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row === undefined || row.length !== expectedHeader.length) {
      fail(`source media manifest row ${index + 2} has an invalid column count`);
    }
    const get = (column: number): string => {
      const value = row[column];
      if (value === undefined) {
        fail(`source media manifest row ${index + 2} is missing column ${column + 1}`);
      }
      return value;
    };
    const objectKey = normalizeStorageObjectKey(
      get(0),
      `source media manifest row ${index + 2}.object_key`,
    );
    if (records.has(objectKey)) {
      fail(`source media manifest contains duplicate object key ${objectKey}`);
    }
    records.set(objectKey, {
      activePrimary: parseBoolean(get(8), `source media manifest row ${index + 2}.active_primary`),
      byteSize: positiveInteger(Number(get(2)), `source media manifest row ${index + 2}.byte_size`),
      fileHash: normalizeSha256(get(1), `source media manifest row ${index + 2}.file_hash`),
      height: positiveInteger(Number(get(5)), `source media manifest row ${index + 2}.height`),
      mimeType: normalizeMimeType(get(3), `source media manifest row ${index + 2}.mime_type`),
      objectKey,
      publicationStatus: requiredString(
        get(7),
        `source media manifest row ${index + 2}.publication_status`,
      ),
      rightsStatus: requiredString(get(6), `source media manifest row ${index + 2}.rights_status`),
      width: positiveInteger(Number(get(4)), `source media manifest row ${index + 2}.width`),
    });
  }
  return records;
}

function canonicalize(value: unknown): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      fail('canonical JSON cannot contain non-finite numbers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isRecord(value)) {
    const result: JsonObject = {};
    for (const key of Object.keys(value).sort(compareText)) {
      const child = value[key];
      if (child !== undefined) {
        result[key] = canonicalize(child);
      }
    }
    return result;
  }
  fail('canonical JSON contains an unsupported value');
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function checksummedDocument(payload: JsonObject): ChecksummedDocument {
  return {
    ...payload,
    manifestChecksumSha256: sha256(canonicalStringify(payload)),
  } as ChecksummedDocument;
}

function verifyDocumentChecksum(document: unknown, label: string): ChecksummedDocument {
  if (!isRecord(document)) {
    fail(`${label} must be a JSON object`);
  }
  const checksum = normalizeSha256(
    document['manifestChecksumSha256'],
    `${label}.manifestChecksumSha256`,
  );
  const payload = { ...document };
  delete payload['manifestChecksumSha256'];
  if (sha256(canonicalStringify(payload)) !== checksum) {
    fail(`${label} checksum does not match its content`);
  }
  return document as ChecksummedDocument;
}

async function readJson(filePath: string, label: string): Promise<unknown> {
  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    fail(`${label} does not exist or is unreadable: ${filePath}`);
  }
  try {
    return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/u, '')) as unknown;
  } catch {
    fail(`${label} is not valid JSON: ${filePath}`);
  }
}

async function fingerprint(filePath: string, repoRoot: string): Promise<InputFingerprint> {
  const bytes = await readFile(filePath);
  return {
    path: displayPath(filePath, repoRoot),
    sha256: sha256(bytes),
  };
}

function displayPath(filePath: string, repoRoot: string): string {
  const relative = path.relative(repoRoot, filePath);
  if (relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join('/');
  }
  return path.resolve(filePath).split(path.sep).join('/');
}

function resolveOptionPath(repoRoot: string, optionPath: string): string {
  return path.resolve(repoRoot, optionPath);
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateWorkDirectory(repoRoot: string, workDir: string): void {
  if (isWithin(repoRoot, workDir) && !isWithin(path.join(repoRoot, '.local'), workDir)) {
    fail('work directory inside the repository must be under the ignored .local directory');
  }
}

function parsePositiveFlag(value: string | undefined, flag: string): number {
  if (value === undefined) {
    fail(`${flag} requires a value`);
  }
  return positiveInteger(Number(value), flag);
}

function parseNonNegativeFlag(value: string | undefined, flag: string): number {
  if (value === undefined) {
    fail(`${flag} requires a value`);
  }
  return nonNegativeInteger(Number(value), flag);
}

function optionValue(
  argument: string,
  following: string | undefined,
): {
  consumedFollowing: boolean;
  name: string;
  value: string;
} {
  const equalsIndex = argument.indexOf('=');
  if (equalsIndex >= 0) {
    return {
      consumedFollowing: false,
      name: argument.slice(0, equalsIndex),
      value: argument.slice(equalsIndex + 1),
    };
  }
  if (following === undefined || following.startsWith('--')) {
    fail(`${argument} requires a value`);
  }
  return { consumedFollowing: true, name: argument, value: following };
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  const [rawMode, ...rest] = arguments_;
  if (rawMode !== 'optimize' && rawMode !== 'upload' && rawMode !== 'verify') {
    fail('usage: phase2a-media <optimize|upload|verify> [options]');
  }
  const values = new Map<string, string>();
  let remote = false;
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === undefined) {
      continue;
    }
    if (argument === '--remote') {
      remote = true;
      continue;
    }
    if (!argument.startsWith('--')) {
      fail(`unexpected positional argument: ${argument}`);
    }
    const parsed = optionValue(argument, rest[index + 1]);
    const supported = new Set([
      '--bucket',
      '--concurrency',
      '--exclusions',
      '--expected-exclusions',
      '--legacy-root',
      '--materials',
      '--max-side',
      '--quality',
      '--root',
      '--source-manifest',
      '--work-dir',
    ]);
    if (!supported.has(parsed.name)) {
      fail(`unsupported option: ${parsed.name}`);
    }
    if (values.has(parsed.name)) {
      fail(`duplicate option: ${parsed.name}`);
    }
    values.set(parsed.name, parsed.value);
    if (parsed.consumedFollowing) {
      index += 1;
    }
  }

  const repoRoot = path.resolve(values.get('--root') ?? process.cwd());
  const bucket = values.get('--bucket') ?? DEFAULT_BUCKET;
  if (bucket !== DEFAULT_BUCKET) {
    fail('Phase 2A catalog media may only be uploaded to the catalog bucket');
  }
  const webpQuality = parsePositiveFlag(
    values.get('--quality') ?? String(DEFAULT_WEBP_QUALITY),
    '--quality',
  );
  if (webpQuality < 78 || webpQuality > 82) {
    fail('--quality must be between 78 and 82');
  }
  const maxSide = parsePositiveFlag(
    values.get('--max-side') ?? String(DEFAULT_MAX_SIDE),
    '--max-side',
  );
  if (maxSide < 1_200 || maxSide > 1_600) {
    fail('--max-side must be between 1200 and 1600');
  }
  const workDir = resolveOptionPath(repoRoot, values.get('--work-dir') ?? DEFAULT_WORK_DIR);
  validateWorkDirectory(repoRoot, workDir);
  const legacyRootValue = values.get('--legacy-root');
  return {
    bucket,
    concurrency: parsePositiveFlag(
      values.get('--concurrency') ?? String(DEFAULT_CONCURRENCY),
      '--concurrency',
    ),
    exclusionsPath: resolveOptionPath(
      repoRoot,
      values.get('--exclusions') ?? DEFAULT_EXCLUSIONS_PATH,
    ),
    expectedExclusions: parseNonNegativeFlag(
      values.get('--expected-exclusions') ?? String(DEFAULT_EXPECTED_EXCLUSIONS),
      '--expected-exclusions',
    ),
    ...(legacyRootValue === undefined
      ? {}
      : { legacyRoot: resolveOptionPath(repoRoot, legacyRootValue) }),
    materialsPath: resolveOptionPath(repoRoot, values.get('--materials') ?? DEFAULT_MATERIALS_PATH),
    maxSide,
    mode: rawMode,
    remote,
    repoRoot,
    sourceManifestPath: resolveOptionPath(
      repoRoot,
      values.get('--source-manifest') ?? DEFAULT_SOURCE_MANIFEST_PATH,
    ),
    webpQuality,
    workDir,
  };
}

function loadSharp(repoRoot: string): SharpFactory {
  const requireFromWeb = createRequire(path.join(repoRoot, 'apps/web/package.json'));
  let moduleValue: unknown;
  try {
    moduleValue = requireFromWeb('sharp');
  } catch {
    fail('sharp is unavailable; run pnpm install before the media pipeline');
  }
  const candidate =
    isRecord(moduleValue) && 'default' in moduleValue ? moduleValue['default'] : moduleValue;
  if (typeof candidate !== 'function') {
    fail('sharp resolved to an unsupported module shape');
  }
  return candidate as SharpFactory;
}

function actualMimeType(metadata: SharpMetadata, field: string): string {
  const mapping: Record<string, string> = {
    avif: 'image/avif',
    gif: 'image/gif',
    heif: 'image/heif',
    jpeg: 'image/jpeg',
    png: 'image/png',
    tiff: 'image/tiff',
    webp: 'image/webp',
  };
  const format = metadata.format;
  if (format === undefined || mapping[format] === undefined) {
    fail(`${field} has an unsupported or undetectable image format`);
  }
  return mapping[format];
}

async function optimizeBytes(
  sharp: SharpFactory,
  input: Buffer,
  source: PrimaryMedia,
  maxSide: number,
  quality: number,
): Promise<{ bytes: Buffer; height: number; width: number }> {
  let metadata: SharpMetadata;
  try {
    metadata = await sharp(input, {
      animated: false,
      failOn: 'error',
      limitInputPixels: 100_000_000,
    }).metadata();
  } catch {
    fail(`legacy object ${source.objectKey} cannot be decoded as a safe image`);
  }
  const mimeType = actualMimeType(metadata, `legacy object ${source.objectKey}`);
  if (mimeType !== source.mimeType) {
    fail(`legacy object ${source.objectKey} actual MIME does not match the manifest`);
  }
  if (metadata.width !== source.width || metadata.height !== source.height) {
    fail(`legacy object ${source.objectKey} dimensions do not match the manifest`);
  }
  if ((metadata.pages ?? 1) !== 1) {
    fail(`legacy object ${source.objectKey} must be a single-frame image`);
  }

  let result: SharpResult;
  try {
    result = await sharp(input, {
      animated: false,
      failOn: 'error',
      limitInputPixels: 100_000_000,
    })
      .rotate()
      .resize({
        fit: 'inside',
        height: maxSide,
        kernel: 'lanczos3',
        width: maxSide,
        withoutEnlargement: true,
      })
      .webp({ effort: 4, quality, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
  } catch {
    fail(`legacy object ${source.objectKey} failed deterministic WebP encoding`);
  }
  if (
    result.info.format !== 'webp' ||
    result.info.width <= 0 ||
    result.info.height <= 0 ||
    result.info.width > maxSide ||
    result.info.height > maxSide
  ) {
    fail(`legacy object ${source.objectKey} produced invalid optimized dimensions`);
  }
  const outputMetadata = await sharp(result.data, {
    animated: false,
    failOn: 'error',
    limitInputPixels: 100_000_000,
  }).metadata();
  if (
    outputMetadata.format !== 'webp' ||
    outputMetadata.exif !== undefined ||
    outputMetadata.icc !== undefined ||
    outputMetadata.xmp !== undefined
  ) {
    fail(`legacy object ${source.objectKey} did not produce metadata-free WebP`);
  }
  if (result.data.byteLength > STANDARD_UPLOAD_LIMIT_BYTES) {
    fail(
      `legacy object ${source.objectKey} remains larger than the safe standard-upload limit after optimization`,
    );
  }
  return { bytes: result.data, height: result.info.height, width: result.info.width };
}

function localObjectPath(root: string, objectKey: string): string {
  const safeKey = normalizeStorageObjectKey(objectKey, 'legacy object key');
  const target = path.resolve(root, ...safeKey.split('/'));
  if (!isWithin(root, target) || target === root) {
    fail('legacy object key escapes the configured local source root');
  }
  return target;
}

class LocalLegacyObjectSource implements LegacyObjectSource {
  public constructor(private readonly root: string) {}

  public close(): void {}

  public async readObject(objectKey: string, expectedBytes: number): Promise<Buffer> {
    let bytes: Buffer;
    try {
      bytes = await readFile(localObjectPath(this.root, objectKey));
    } catch {
      fail(`legacy object is missing or unreadable: ${objectKey}`);
    }
    if (bytes.byteLength !== expectedBytes) {
      fail(`legacy object ${objectKey} byte size does not match the manifest`);
    }
    return bytes;
  }
}

interface S3ClientLike {
  destroy(): void;
  send(command: unknown): Promise<unknown>;
}

interface S3ModuleLike {
  GetObjectCommand: new (input: { Bucket: string; Key: string }) => unknown;
  S3Client: new (config: JsonObject) => S3ClientLike;
}

interface S3SourceConfig {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
}

function optionalEnvironment(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? undefined : value;
}

async function localS3Config(repoRoot: string): Promise<S3SourceConfig> {
  const statePath = path.join(repoRoot, '.local/foundation-environment/state.json');
  const secretsPath = path.join(repoRoot, '.local/foundation-environment/secrets.json');
  const state = await readJson(statePath, 'legacy storage state');
  const secrets = await readJson(secretsPath, 'legacy storage secrets');
  if (!isRecord(state) || !isRecord(secrets)) {
    fail('legacy storage local adapter files have an invalid shape');
  }
  const port = positiveInteger(state['storagePort'], 'legacy storage state.storagePort');
  return {
    accessKeyId: requiredString(secrets['storageAccessKey'], 'legacy storage access key'),
    bucket: 'project-name-local-private',
    endpoint: `http://127.0.0.1:${port}`,
    forcePathStyle: true,
    region: 'local',
    secretAccessKey: requiredString(secrets['storageSecretKey'], 'legacy storage secret key'),
  };
}

function parseForcePathStyle(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  return parseBoolean(value, 'S3_FORCE_PATH_STYLE');
}

async function resolveS3Config(repoRoot: string): Promise<S3SourceConfig> {
  const names = ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET_PRIVATE'];
  const present = names.filter((name) => optionalEnvironment(name) !== undefined);
  if (present.length === 0) {
    return localS3Config(repoRoot);
  }
  if (present.length !== names.length) {
    const missing = names.filter((name) => optionalEnvironment(name) === undefined);
    fail(`legacy S3 environment is incomplete; missing names: ${missing.join(', ')}`);
  }
  return {
    accessKeyId: requiredString(optionalEnvironment('S3_ACCESS_KEY_ID'), 'S3_ACCESS_KEY_ID'),
    bucket: requiredString(optionalEnvironment('S3_BUCKET_PRIVATE'), 'S3_BUCKET_PRIVATE'),
    endpoint: requiredString(optionalEnvironment('S3_ENDPOINT'), 'S3_ENDPOINT'),
    forcePathStyle: parseForcePathStyle(optionalEnvironment('S3_FORCE_PATH_STYLE')),
    region: optionalEnvironment('S3_REGION') ?? 'local',
    secretAccessKey: requiredString(
      optionalEnvironment('S3_SECRET_ACCESS_KEY'),
      'S3_SECRET_ACCESS_KEY',
    ),
  };
}

async function bodyToBuffer(body: unknown, objectKey: string): Promise<Buffer> {
  if (isRecord(body) && typeof body['transformToByteArray'] === 'function') {
    const bytes = (await body['transformToByteArray']()) as Uint8Array;
    return Buffer.from(bytes);
  }
  if (body !== null && typeof body === 'object' && Symbol.asyncIterator in body) {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  fail(`legacy S3 object ${objectKey} returned an unsupported response body`);
}

class S3LegacyObjectSource implements LegacyObjectSource {
  public constructor(
    private readonly client: S3ClientLike,
    private readonly GetObjectCommand: S3ModuleLike['GetObjectCommand'],
    private readonly bucket: string,
  ) {}

  public close(): void {
    this.client.destroy();
  }

  public async readObject(objectKey: string, expectedBytes: number): Promise<Buffer> {
    let response: unknown;
    try {
      response = await this.client.send(
        new this.GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
    } catch {
      fail(`legacy S3 object is unavailable: ${objectKey}`);
    }
    if (!isRecord(response) || response['Body'] === undefined) {
      fail(`legacy S3 object ${objectKey} returned no body`);
    }
    if (response['ContentLength'] !== undefined && response['ContentLength'] !== expectedBytes) {
      fail(`legacy S3 object ${objectKey} content length does not match the manifest`);
    }
    const bytes = await bodyToBuffer(response['Body'], objectKey);
    if (bytes.byteLength !== expectedBytes) {
      fail(`legacy S3 object ${objectKey} byte size does not match the manifest`);
    }
    return bytes;
  }
}

async function createLegacySource(options: CliOptions): Promise<LegacyObjectSource> {
  if (options.legacyRoot !== undefined) {
    return new LocalLegacyObjectSource(options.legacyRoot);
  }
  const config = await resolveS3Config(options.repoRoot);
  const requireFromStorage = createRequire(
    path.join(options.repoRoot, 'packages/storage/package.json'),
  );
  let moduleValue: unknown;
  try {
    moduleValue = requireFromStorage('@aws-sdk/client-s3');
  } catch {
    fail('@aws-sdk/client-s3 is unavailable; run pnpm install before the media pipeline');
  }
  if (
    !isRecord(moduleValue) ||
    typeof moduleValue['S3Client'] !== 'function' ||
    typeof moduleValue['GetObjectCommand'] !== 'function'
  ) {
    fail('@aws-sdk/client-s3 resolved to an unsupported module shape');
  }
  const s3 = moduleValue as unknown as S3ModuleLike;
  const client = new s3.S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  });
  return new S3LegacyObjectSource(client, s3.GetObjectCommand, config.bucket);
}

function assertSourceRecordMatches(primary: PrimaryMedia, record: SourceMediaRecord): void {
  const fields: Array<keyof PrimaryMedia> = [
    'byteSize',
    'fileHash',
    'height',
    'mimeType',
    'objectKey',
    'publicationStatus',
    'rightsStatus',
    'width',
  ];
  for (const field of fields) {
    if (primary[field] !== record[field]) {
      fail(
        `transform primary media ${primary.objectKey} disagrees with source manifest field ${field}`,
      );
    }
  }
  if (!record.activePrimary) {
    fail(`transform primary media ${primary.objectKey} is not active_primary in source manifest`);
  }
}

function deferReason(primary: null | PrimaryMedia): DeferredMaterialRecord['reason'] | undefined {
  if (primary === null) {
    return 'NO_PRIMARY_MEDIA';
  }
  if (!APPROVED_RIGHTS.has(primary.rightsStatus)) {
    return 'RIGHTS_NOT_APPROVED';
  }
  if (primary.publicationStatus !== APPROVED_PUBLICATION_STATUS) {
    return 'PUBLICATION_NOT_APPROVED';
  }
  return undefined;
}

async function mapConcurrent<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(values.length, 1)) },
    async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        const value = values[index];
        if (value === undefined) {
          fail('concurrent mapper encountered a sparse input array');
        }
        results[index] = await mapper(value, index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

async function writeObjectIfMissing(filePath: string, bytes: Buffer): Promise<boolean> {
  const expectedHash = sha256(bytes);
  try {
    const existing = await readFile(filePath);
    if (existing.byteLength !== bytes.byteLength || sha256(existing) !== expectedHash) {
      fail(`existing optimized object does not match its content-addressed path: ${filePath}`);
    }
    return false;
  } catch (error) {
    if (error instanceof MediaPipelineError) {
      throw error;
    }
    if (!hasErrorCode(error, 'ENOENT')) {
      fail(`existing optimized object is unreadable: ${filePath}`);
    }
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await writeFile(filePath, bytes, { flag: 'wx' });
    return true;
  } catch (error) {
    if (!hasErrorCode(error, 'EEXIST')) {
      fail(`optimized object cannot be created: ${filePath}`);
    }
    const existing = await readFile(filePath);
    if (existing.byteLength !== bytes.byteLength || sha256(existing) !== expectedHash) {
      fail(`optimized object path collision: ${filePath}`);
    }
    return false;
  }
}

async function writeTextIfChanged(filePath: string, text: string): Promise<boolean> {
  try {
    if ((await readFile(filePath, 'utf8')) === text) {
      return false;
    }
  } catch {
    // A missing generated file is created below.
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, 'utf8');
  return true;
}

function prettyDocument(document: ChecksummedDocument): string {
  return `${JSON.stringify(canonicalize(document), null, 2)}\n`;
}

async function loadInputs(options: CliOptions): Promise<{
  exclusions: CategoryExclusionsDocument;
  fingerprints: {
    exclusions: InputFingerprint;
    materials: InputFingerprint;
    sourceMediaManifest: InputFingerprint;
  };
  materials: TransformMaterial[];
  sourceRecords: Map<string, SourceMediaRecord>;
}> {
  const [
    materialsJson,
    exclusionsJson,
    sourceText,
    materialsFingerprint,
    exclusionsFingerprint,
    sourceFingerprint,
  ] = await Promise.all([
    readJson(options.materialsPath, 'transformed materials'),
    readJson(options.exclusionsPath, 'category exclusions'),
    readFile(options.sourceManifestPath, 'utf8'),
    fingerprint(options.materialsPath, options.repoRoot),
    fingerprint(options.exclusionsPath, options.repoRoot),
    fingerprint(options.sourceManifestPath, options.repoRoot),
  ]);
  const materials = parseMaterialsDocument(materialsJson);
  const exclusions = parseCategoryExclusionsDocument(exclusionsJson, options.expectedExclusions);
  const excludedIds = new Set(
    exclusions.exclusions.flatMap((exclusion) => [
      exclusion.legacyId,
      ...exclusion.descendantCategoryLegacyIds,
    ]),
  );
  for (const material of materials) {
    if (excludedIds.has(material.categoryLegacySourceId)) {
      fail(
        `retained material ${material.legacySourceId} belongs to an OWNER-DECISION-022 excluded category`,
      );
    }
  }
  return {
    exclusions,
    fingerprints: {
      exclusions: exclusionsFingerprint,
      materials: materialsFingerprint,
      sourceMediaManifest: sourceFingerprint,
    },
    materials,
    sourceRecords: parseSourceManifest(sourceText),
  };
}

function materialManifestRecord(
  material: TransformMaterial,
  optimized: OptimizedSource,
): MaterialManifestRecord {
  return {
    categoryLegacySourceId: material.categoryLegacySourceId,
    ...(material.legacyId === undefined ? {} : { legacyId: material.legacyId }),
    legacySourceId: material.legacySourceId,
    localRelativePath: optimized.localRelativePath,
    optimizedByteSize: optimized.optimizedByteSize,
    optimizedHash: optimized.optimizedHash,
    optimizedHeight: optimized.optimizedHeight,
    optimizedWidth: optimized.optimizedWidth,
    sourceByteSize: optimized.source.byteSize,
    sourceFileHash: optimized.source.fileHash,
    sourceHeight: optimized.source.height,
    sourceMimeType: optimized.source.mimeType,
    sourceObjectKey: optimized.source.objectKey,
    sourceWidth: optimized.source.width,
    storagePath: optimized.storagePath,
  };
}

async function buildManifests(options: CliOptions, writeObjects: boolean): Promise<BuildResult> {
  const inputs = await loadInputs(options);
  const sharp = loadSharp(options.repoRoot);
  const source = await createLegacySource(options);
  const sourceCache = new Map<string, Promise<{ bytes: Buffer; optimized: OptimizedSource }>>();
  const optimizedBytesByHash = new Map<string, Buffer>();
  let createdObjectCount = 0;
  let reusedObjectCount = 0;

  try {
    const processed = await mapConcurrent(
      inputs.materials,
      options.concurrency,
      async (material): Promise<DeferredMaterialRecord | MaterialManifestRecord> => {
        const reason = deferReason(material.primaryMedia);
        if (reason !== undefined) {
          const primary = material.primaryMedia;
          return {
            categoryLegacySourceId: material.categoryLegacySourceId,
            declaredPrimaryMediaBytes: primary?.byteSize ?? 0,
            ...(material.legacyId === undefined ? {} : { legacyId: material.legacyId }),
            legacySourceId: material.legacySourceId,
            reason,
            ...(primary === null
              ? {}
              : {
                  sourceFileHash: primary.fileHash,
                  sourceObjectKey: primary.objectKey,
                }),
          };
        }
        const primary = material.primaryMedia;
        if (primary === null) {
          fail('eligible material unexpectedly has null primary media');
        }
        const sourceRecord = inputs.sourceRecords.get(primary.objectKey);
        if (sourceRecord === undefined) {
          fail(`transform primary media is absent from source manifest: ${primary.objectKey}`);
        }
        assertSourceRecordMatches(primary, sourceRecord);
        const sourceIdentity = `${primary.objectKey}\0${primary.fileHash}`;
        let promise = sourceCache.get(sourceIdentity);
        if (promise === undefined) {
          promise = (async () => {
            const legacyBytes = await source.readObject(primary.objectKey, primary.byteSize);
            if (sha256(legacyBytes) !== primary.fileHash) {
              fail(`legacy object ${primary.objectKey} SHA-256 does not match the manifest`);
            }
            const optimizedImage = await optimizeBytes(
              sharp,
              legacyBytes,
              primary,
              options.maxSide,
              options.webpQuality,
            );
            const optimizedHash = sha256(optimizedImage.bytes);
            const prefix = optimizedHash.slice(0, 2);
            const localRelativePath = `optimized/${prefix}/${optimizedHash}.webp`;
            const storagePath = `materials/${prefix}/${optimizedHash}.webp`;
            return {
              bytes: optimizedImage.bytes,
              optimized: {
                localRelativePath,
                optimizedByteSize: optimizedImage.bytes.byteLength,
                optimizedHash,
                optimizedHeight: optimizedImage.height,
                optimizedWidth: optimizedImage.width,
                source: primary,
                storagePath,
              },
            };
          })();
          sourceCache.set(sourceIdentity, promise);
        }
        const result = await promise;
        const existingOptimizedBytes = optimizedBytesByHash.get(result.optimized.optimizedHash);
        if (existingOptimizedBytes !== undefined && !existingOptimizedBytes.equals(result.bytes)) {
          fail(`optimized SHA-256 collision for ${result.optimized.optimizedHash}`);
        }
        optimizedBytesByHash.set(result.optimized.optimizedHash, result.bytes);
        return materialManifestRecord(material, result.optimized);
      },
    );

    const deferredMaterials = processed.filter(
      (record): record is DeferredMaterialRecord => 'reason' in record,
    );
    const materialRecords = processed.filter(
      (record): record is MaterialManifestRecord => !('reason' in record),
    );
    const objectMap = new Map<string, ObjectManifestRecord>();
    const uniqueSourceObjects = new Map<string, number>();
    for (const material of materialRecords) {
      uniqueSourceObjects.set(material.sourceFileHash, material.sourceByteSize);
      const existing = objectMap.get(material.optimizedHash);
      if (existing === undefined) {
        objectMap.set(material.optimizedHash, {
          byteSize: material.optimizedByteSize,
          height: material.optimizedHeight,
          legacySourceIds: [material.legacySourceId],
          localRelativePath: material.localRelativePath,
          materialCount: 1,
          sha256: material.optimizedHash,
          storagePath: material.storagePath,
          width: material.optimizedWidth,
        });
      } else {
        if (
          existing.byteSize !== material.optimizedByteSize ||
          existing.localRelativePath !== material.localRelativePath ||
          existing.storagePath !== material.storagePath
        ) {
          fail(`optimized hash collision for ${material.optimizedHash}`);
        }
        existing.legacySourceIds.push(material.legacySourceId);
        existing.materialCount += 1;
      }
    }
    const objects = [...objectMap.values()].sort((left, right) =>
      compareText(left.sha256, right.sha256),
    );
    for (const object of objects) {
      object.legacySourceIds.sort(compareText);
    }
    if (writeObjects) {
      await mapConcurrent(objects, options.concurrency, async (object) => {
        const bytes = optimizedBytesByHash.get(object.sha256);
        if (bytes === undefined) {
          fail(`optimized bytes are unavailable for ${object.sha256}`);
        }
        const created = await writeObjectIfMissing(
          path.join(options.workDir, ...object.localRelativePath.split('/')),
          bytes,
        );
        if (created) {
          createdObjectCount += 1;
        } else {
          reusedObjectCount += 1;
        }
        return true;
      });
    } else {
      for (const object of objects) {
        const objectPath = path.join(options.workDir, ...object.localRelativePath.split('/'));
        let bytes: Buffer;
        try {
          bytes = await readFile(objectPath);
        } catch {
          fail(`optimized object is missing: ${object.localRelativePath}`);
        }
        if (bytes.byteLength !== object.byteSize || sha256(bytes) !== object.sha256) {
          fail(`optimized object checksum mismatch: ${object.localRelativePath}`);
        }
        const metadata = await sharp(bytes, {
          animated: false,
          failOn: 'error',
          limitInputPixels: 100_000_000,
        }).metadata();
        if (
          metadata.format !== 'webp' ||
          metadata.width !== object.width ||
          metadata.height !== object.height ||
          metadata.exif !== undefined ||
          metadata.icc !== undefined ||
          metadata.xmp !== undefined
        ) {
          fail(`optimized object metadata mismatch: ${object.localRelativePath}`);
        }
      }
    }

    const manifestPayload: UploadManifestPayload = {
      counts: {
        duplicateOptimizedMaterialReferences: materialRecords.length - objects.length,
        materialCount: inputs.materials.length,
        migratedMaterialCount: materialRecords.length,
        optimizedBytes: objects.reduce((sum, object) => sum + object.byteSize, 0),
        optimizedObjectCount: objects.length,
        sourceBytes: [...uniqueSourceObjects.values()].reduce((sum, bytes) => sum + bytes, 0),
        sourceObjectCount: uniqueSourceObjects.size,
      },
      inputs: canonicalize(inputs.fingerprints) as JsonObject,
      materials: canonicalize(materialRecords) as JsonValue[],
      objects: canonicalize(objects) as JsonValue[],
      policy: {
        bucket: DEFAULT_BUCKET,
        decision: 'OWNER-DECISION-022',
        exif: 'stripped',
        filename: 'sha256.webp',
        maxSidePx: options.maxSide,
        primaryImagesPerMaterial: 1,
        webpQuality: options.webpQuality,
      },
      schemaVersion: 1,
    };
    const deferredBytes = deferredMaterials.reduce(
      (sum, material) => sum + material.declaredPrimaryMediaBytes,
      0,
    );
    const deferredDistinctMedia = new Set(
      deferredMaterials.flatMap((material) =>
        material.sourceFileHash === undefined ? [] : [material.sourceFileHash],
      ),
    ).size;
    const deferredPayload: DeferredManifestPayload = {
      counts: {
        deferredDeclaredPrimaryMediaBytes: deferredBytes,
        deferredDistinctPrimaryMediaCount: deferredDistinctMedia,
        deferredMaterialCount: deferredMaterials.length,
        ownerExcludedCategoryCount: inputs.exclusions.totals.categoryCount,
        ownerExcludedDistinctPrimaryMediaCount: inputs.exclusions.totals.distinctPrimaryMediaCount,
        ownerExcludedMaterialCount: inputs.exclusions.totals.materialCount,
        ownerExcludedPrimaryMediaBytes: inputs.exclusions.totals.primaryMediaBytes,
        totalNotMigratedMaterialCount:
          deferredMaterials.length + inputs.exclusions.totals.materialCount,
        totalNotMigratedPrimaryMediaBytes:
          deferredBytes + inputs.exclusions.totals.primaryMediaBytes,
      },
      deferredMaterials: canonicalize(deferredMaterials) as JsonValue[],
      inputs: canonicalize(inputs.fingerprints) as JsonObject,
      ownerExclusions: canonicalize(inputs.exclusions) as JsonObject,
      schemaVersion: 1,
    };
    const manifest = checksummedDocument(manifestPayload);
    const deferredManifest = checksummedDocument(deferredPayload);
    const manifestPath = path.join(options.workDir, 'catalog-upload-manifest.json');
    const deferredPath = path.join(options.workDir, 'catalog-deferred-excluded-manifest.json');
    let manifestChanged = false;
    let deferredManifestChanged = false;
    if (writeObjects) {
      [manifestChanged, deferredManifestChanged] = await Promise.all([
        writeTextIfChanged(manifestPath, prettyDocument(manifest)),
        writeTextIfChanged(deferredPath, prettyDocument(deferredManifest)),
      ]);
    }
    return {
      createdObjectCount,
      deferredManifest,
      deferredManifestChanged,
      manifest,
      manifestChanged,
      reusedObjectCount,
    };
  } finally {
    source.close();
  }
}

async function findOptimizedFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  async function visit(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.webp')) {
        results.push(path.relative(root, fullPath).split(path.sep).join('/'));
      }
    }
  }
  await visit(root);
  return results.sort(compareText);
}

function objectsFromManifest(document: ChecksummedDocument): ObjectManifestRecord[] {
  if (!Array.isArray(document['objects'])) {
    fail('catalog upload manifest must contain an objects array');
  }
  return document['objects'].map((value, index): ObjectManifestRecord => {
    if (!isRecord(value) || !Array.isArray(value['legacySourceIds'])) {
      fail(`catalog upload manifest objects[${index}] has an invalid shape`);
    }
    const hash = normalizeSha256(
      value['sha256'],
      `catalog upload manifest objects[${index}].sha256`,
    );
    const localRelativePath = requiredString(
      value['localRelativePath'],
      `catalog upload manifest objects[${index}].localRelativePath`,
    );
    const storagePath = normalizeStorageObjectKey(
      value['storagePath'],
      `catalog upload manifest objects[${index}].storagePath`,
    );
    const expectedLocalPath = `optimized/${hash.slice(0, 2)}/${hash}.webp`;
    const expectedStoragePath = `materials/${hash.slice(0, 2)}/${hash}.webp`;
    if (localRelativePath !== expectedLocalPath || storagePath !== expectedStoragePath) {
      fail(`catalog upload manifest object ${hash} is not content-addressed correctly`);
    }
    return {
      byteSize: positiveInteger(value['byteSize'], `objects[${index}].byteSize`),
      height: positiveInteger(value['height'], `objects[${index}].height`),
      legacySourceIds: value['legacySourceIds'].map((id, idIndex) =>
        requiredString(id, `objects[${index}].legacySourceIds[${idIndex}]`),
      ),
      localRelativePath,
      materialCount: positiveInteger(value['materialCount'], `objects[${index}].materialCount`),
      sha256: hash,
      storagePath,
      width: positiveInteger(value['width'], `objects[${index}].width`),
    };
  });
}

async function readChecksummedManifest(
  filePath: string,
  label: string,
): Promise<ChecksummedDocument> {
  return verifyDocumentChecksum(await readJson(filePath, label), label);
}

interface StorageErrorLike {
  message?: string;
  status?: number | string;
  statusCode?: number | string;
}

interface StorageBucketLike {
  download(path: string): Promise<{ data: null | Blob; error: null | StorageErrorLike }>;
  upload(
    path: string,
    bytes: Buffer,
    options: { cacheControl: string; contentType: string; upsert: false },
  ): Promise<{ data: unknown; error: null | StorageErrorLike }>;
}

interface SupabaseClientLike {
  storage: {
    from(bucket: string): StorageBucketLike;
  };
}

interface SupabaseModuleLike {
  createClient(url: string, key: string, options: JsonObject): SupabaseClientLike;
}

function assertServiceRoleKey(key: string): void {
  if (key.startsWith('sb_secret_')) {
    return;
  }
  const segments = key.split('.');
  if (segments.length !== 3 || segments[1] === undefined) {
    fail('SUPABASE_SERVICE_ROLE_KEY has an unsupported key format');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as unknown;
  } catch {
    fail('SUPABASE_SERVICE_ROLE_KEY has an invalid JWT payload');
  }
  if (!isRecord(payload) || payload['role'] !== 'service_role') {
    fail('SUPABASE_SERVICE_ROLE_KEY is not a service_role credential');
  }
}

function requireServerSupabaseCredentials(): { key: string; url: string } {
  if (optionalEnvironment('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY') !== undefined) {
    fail('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must never be defined');
  }
  const key = optionalEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  if (key === undefined) {
    fail('SUPABASE_SERVICE_ROLE_KEY is required for server-side media upload or remote verify');
  }
  const publicCandidates = [
    optionalEnvironment('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    optionalEnvironment('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    optionalEnvironment('SUPABASE_ANON_KEY'),
    optionalEnvironment('SUPABASE_PUBLISHABLE_KEY'),
  ].filter((value): value is string => value !== undefined);
  if (publicCandidates.includes(key) || key.startsWith('sb_publishable_')) {
    fail('SUPABASE_SERVICE_ROLE_KEY contains a publishable/anon key instead of a service role key');
  }
  assertServiceRoleKey(key);
  const url =
    optionalEnvironment('SUPABASE_URL') ?? optionalEnvironment('NEXT_PUBLIC_SUPABASE_URL');
  if (url === undefined) {
    fail('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required');
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail('Supabase URL is invalid');
  }
  if (
    parsed.protocol !== 'https:' &&
    parsed.hostname !== '127.0.0.1' &&
    parsed.hostname !== 'localhost'
  ) {
    fail('Supabase URL must use HTTPS outside local development');
  }
  return { key, url: parsed.toString().replace(/\/$/u, '') };
}

function createSupabaseClient(repoRoot: string): SupabaseClientLike {
  const credentials = requireServerSupabaseCredentials();
  const requireFromWeb = createRequire(path.join(repoRoot, 'apps/web/package.json'));
  let moduleValue: unknown;
  try {
    moduleValue = requireFromWeb('@supabase/supabase-js');
  } catch {
    fail('@supabase/supabase-js is unavailable; run pnpm install before upload');
  }
  if (!isRecord(moduleValue) || typeof moduleValue['createClient'] !== 'function') {
    fail('@supabase/supabase-js resolved to an unsupported module shape');
  }
  const supabase = moduleValue as unknown as SupabaseModuleLike;
  return supabase.createClient(credentials.url, credentials.key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { 'X-Client-Info': 'project-name-phase2a-media-migration/1' },
    },
  });
}

function storageErrorStatus(error: StorageErrorLike): string {
  return String(error.statusCode ?? error.status ?? 'unknown');
}

function isMissingStorageObject(error: StorageErrorLike): boolean {
  const status = storageErrorStatus(error);
  const message = error.message?.toLowerCase() ?? '';
  return status === '404' || (status === '400' && message.includes('not found'));
}

function isDuplicateStorageObject(error: StorageErrorLike): boolean {
  const status = storageErrorStatus(error);
  const message = error.message?.toLowerCase() ?? '';
  return (
    status === '409' ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('resource already exists')
  );
}

async function downloadRemoteBytes(
  bucket: StorageBucketLike,
  object: ObjectManifestRecord,
  allowMissing: boolean,
): Promise<Buffer | undefined> {
  const result = await bucket.download(object.storagePath);
  if (result.error !== null) {
    if (allowMissing && isMissingStorageObject(result.error)) {
      return undefined;
    }
    fail(
      `Supabase Storage download failed for ${object.storagePath} (status ${storageErrorStatus(result.error)})`,
    );
  }
  if (result.data === null) {
    fail(`Supabase Storage returned no bytes for ${object.storagePath}`);
  }
  const bytes = Buffer.from(await result.data.arrayBuffer());
  if (bytes.byteLength !== object.byteSize || sha256(bytes) !== object.sha256) {
    fail(`Supabase Storage hash mismatch for immutable object ${object.storagePath}`);
  }
  return bytes;
}

async function verifyLocalObjects(
  options: CliOptions,
  objects: readonly ObjectManifestRecord[],
): Promise<void> {
  for (const object of objects) {
    const filePath = path.join(options.workDir, ...object.localRelativePath.split('/'));
    const bytes = await readFile(filePath);
    if (bytes.byteLength !== object.byteSize || sha256(bytes) !== object.sha256) {
      fail(`local optimized object hash mismatch: ${object.localRelativePath}`);
    }
  }
}

async function uploadObjects(
  options: CliOptions,
  manifest: ChecksummedDocument,
): Promise<MediaPipelineSummary> {
  const objects = objectsFromManifest(manifest);
  await verifyLocalObjects(options, objects);
  const client = createSupabaseClient(options.repoRoot);
  const bucket = client.storage.from(options.bucket);
  const actions = await mapConcurrent(
    objects,
    options.concurrency,
    async (object): Promise<JsonObject> => {
      const existing = await downloadRemoteBytes(bucket, object, true);
      if (existing !== undefined) {
        return {
          action: 'existing',
          byteSize: object.byteSize,
          sha256: object.sha256,
          storagePath: object.storagePath,
        };
      }
      const localBytes = await readFile(
        path.join(options.workDir, ...object.localRelativePath.split('/')),
      );
      const upload = await bucket.upload(object.storagePath, localBytes, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      });
      if (upload.error !== null && !isDuplicateStorageObject(upload.error)) {
        fail(
          `Supabase Storage upload failed for ${object.storagePath} (status ${storageErrorStatus(upload.error)})`,
        );
      }
      await downloadRemoteBytes(bucket, object, false);
      return {
        action: upload.error === null ? 'uploaded' : 'existing-after-race',
        byteSize: object.byteSize,
        sha256: object.sha256,
        storagePath: object.storagePath,
      };
    },
  );
  const uploadedCount = actions.filter((action) => action['action'] === 'uploaded').length;
  const resultPayload: JsonObject = {
    actions,
    bucket: options.bucket,
    counts: {
      existingObjectCount: objects.length - uploadedCount,
      objectCount: objects.length,
      totalBytes: objects.reduce((sum, object) => sum + object.byteSize, 0),
      uploadedObjectCount: uploadedCount,
    },
    schemaVersion: 1,
    uploadManifestChecksumSha256: manifest['manifestChecksumSha256'],
  };
  const resultDocument = checksummedDocument(resultPayload);
  await writeTextIfChanged(
    path.join(options.workDir, 'catalog-upload-result.json'),
    prettyDocument(resultDocument),
  );
  return {
    existingObjectCount: objects.length - uploadedCount,
    mode: 'upload',
    objectCount: objects.length,
    ok: true,
    uploadedObjectCount: uploadedCount,
  };
}

async function verifyRemoteObjects(
  options: CliOptions,
  objects: readonly ObjectManifestRecord[],
): Promise<void> {
  const client = createSupabaseClient(options.repoRoot);
  const bucket = client.storage.from(options.bucket);
  await mapConcurrent(objects, options.concurrency, async (object) => {
    await downloadRemoteBytes(bucket, object, false);
    return true;
  });
}

async function runOptimize(options: CliOptions): Promise<MediaPipelineSummary> {
  const result = await buildManifests(options, true);
  const objects = objectsFromManifest(result.manifest);
  return {
    createdObjectCount: result.createdObjectCount,
    deferredManifestChanged: result.deferredManifestChanged,
    deferredMaterialCount: (result.deferredManifest['deferredMaterials'] as JsonValue[]).length,
    manifestChanged: result.manifestChanged,
    migratedMaterialCount: (result.manifest['materials'] as JsonValue[]).length,
    mode: 'optimize',
    objectCount: objects.length,
    ok: true,
    optimizedBytes: objects.reduce((sum, object) => sum + object.byteSize, 0),
    reusedObjectCount: result.reusedObjectCount,
  };
}

async function runUpload(options: CliOptions): Promise<MediaPipelineSummary> {
  const manifest = await readChecksummedManifest(
    path.join(options.workDir, 'catalog-upload-manifest.json'),
    'catalog upload manifest',
  );
  const currentInputs = await loadInputs(options);
  if (canonicalStringify(manifest['inputs']) !== canonicalStringify(currentInputs.fingerprints)) {
    fail('catalog upload manifest inputs are stale; optimize again before upload');
  }
  return uploadObjects(options, manifest);
}

async function runVerify(options: CliOptions): Promise<MediaPipelineSummary> {
  const manifestPath = path.join(options.workDir, 'catalog-upload-manifest.json');
  const deferredPath = path.join(options.workDir, 'catalog-deferred-excluded-manifest.json');
  const [storedManifest, storedDeferred, rebuilt] = await Promise.all([
    readChecksummedManifest(manifestPath, 'catalog upload manifest'),
    readChecksummedManifest(deferredPath, 'catalog deferred/excluded manifest'),
    buildManifests(options, false),
  ]);
  if (canonicalStringify(storedManifest) !== canonicalStringify(rebuilt.manifest)) {
    fail('catalog upload manifest is stale or does not match a repeat transformation');
  }
  if (canonicalStringify(storedDeferred) !== canonicalStringify(rebuilt.deferredManifest)) {
    fail('catalog deferred/excluded manifest is stale or does not match current inputs');
  }
  const objects = objectsFromManifest(storedManifest);
  const expectedFiles = objects
    .map((object) => object.localRelativePath.replace(/^optimized\//u, ''))
    .sort(compareText);
  const actualFiles = await findOptimizedFiles(path.join(options.workDir, 'optimized'));
  if (canonicalStringify(actualFiles) !== canonicalStringify(expectedFiles)) {
    fail('optimized directory contains missing or unmanifested WebP files');
  }
  if (options.remote) {
    await verifyRemoteObjects(options, objects);
  }
  return {
    deferredMaterialCount: (storedDeferred['deferredMaterials'] as JsonValue[]).length,
    mode: 'verify',
    objectCount: objects.length,
    ok: true,
    remoteVerified: options.remote,
    repeatNoOp: true,
  };
}

export async function executeMediaPipeline(
  arguments_: readonly string[],
): Promise<MediaPipelineSummary> {
  const options = parseArguments(arguments_);
  if (options.mode === 'optimize') {
    return runOptimize(options);
  }
  if (options.mode === 'upload') {
    return runUpload(options);
  }
  return runVerify(options);
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof MediaPipelineError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `unexpected ${error.name}`;
  }
  return 'unexpected failure';
}

async function main(): Promise<void> {
  try {
    const result = await executeMediaPipeline(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(canonicalize(result))}\n`);
  } catch (error) {
    process.stderr.write(`phase2a-media: ${safeErrorMessage(error)}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(invokedPath)).href
) {
  await main();
}
