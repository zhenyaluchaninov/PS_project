import { ZodIssue } from "zod";
import {
  adventureDtoSchema,
  linkDtoSchema,
  nodeDtoSchema,
  type AdventureDto,
  type LinkDto,
  type NodeDto,
  type CategoryDto,
  type UserDto,
} from "./dto";
import {
  AdventureModel,
  AdventurePropsModel,
  CategoryModel,
  LinkModel,
  NodeModel,
  NodePropsModel,
  UserModel,
} from "./models";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; issues: ZodIssue[] };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isPlainRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  if (isPlainRecord(value)) {
    return value;
  }

  return null;
}

function coerceNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeAdventureProps(raw: unknown): AdventurePropsModel | null {
  const record = parseJsonRecord(raw);
  if (!record) return null;

  const fontList = Array.isArray(record.font_list)
    ? record.font_list.filter((item) => typeof item === "string")
    : Array.isArray(record.fontList)
      ? record.fontList.filter((item) => typeof item === "string")
      : [];

  if (!fontList.length) return null;

  return { fontList };
}

function normalizeNodeProps(raw: unknown): NodePropsModel | null {
  const record = parseJsonRecord(raw);
  if (!record) return null;

  const audioUrl = cleanString(record.audio_url ?? record.audioUrl);
  const audioUrlAlt = cleanString(record.audio_url_alt ?? record.audioUrlAlt);
  const subtitlesUrl = cleanString(
    record.subtitles_url ?? record.subtitlesUrl
  );

  if (!audioUrl && !audioUrlAlt && !subtitlesUrl) return null;

  return { audioUrl, audioUrlAlt, subtitlesUrl };
}

function normalizeLinkProps(raw: unknown): Record<string, unknown> | null {
  const record = parseJsonRecord(raw);
  return record ?? null;
}

function mapCategoryDto(dto: CategoryDto): CategoryModel {
  return {
    id: dto.id,
    sortOrder: dto.sort_order ?? null,
    title: dto.title,
    description: dto.description ?? null,
    icon: dto.icon,
    image: dto.image ?? null,
  };
}

function mapUserDto(dto: UserDto): UserModel {
  return {
    id: dto.id,
    username: dto.username,
    name: dto.name,
    role: dto.role,
    createdAt: dto.created_at ?? null,
    updatedAt: dto.updated_at ?? null,
  };
}

export function mapNodeDto(dto: NodeDto): NodeModel {
  const rawProps = parseJsonRecord(dto.props);
  return {
    id: dto.id,
    nodeId: dto.node_id,
    title: dto.title,
    text: dto.text,
    icon: dto.icon ?? null,
    position: {
      x: dto.x ?? 0,
      y: dto.y ?? 0,
    },
    image: {
      url: dto.image_url ?? null,
      id: dto.image_id ?? null,
      layoutType: dto.image_layout_type ?? null,
    },
    type: dto.type ?? null,
    changed: Boolean(dto.changed),
    props: normalizeNodeProps(rawProps ?? dto.props),
    rawProps,
  };
}

export function mapLinkDto(dto: LinkDto): LinkModel {
  return {
    id: dto.id,
    linkId: dto.link_id,
    source: coerceNumber(dto.source),
    sourceTitle: dto.source_title ?? null,
    target: coerceNumber(dto.target),
    targetTitle: dto.target_title ?? null,
    fromNodeId: coerceNumber(dto.source),
    toNodeId: coerceNumber(dto.target),
    label: dto.target_title ?? dto.source_title ?? null,
    type: dto.type,
    changed: Boolean(dto.changed),
    props: normalizeLinkProps(dto.props),
  };
}

export function mapAdventureDto(dto: AdventureDto): AdventureModel {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? "",
    slug: dto.slug ?? "",
    viewSlug: dto.view_slug,
    locked: dto.locked ?? false,
    createdAt: dto.created_at ?? null,
    updatedAt: dto.updated_at ?? null,
    category: dto.category ? mapCategoryDto(dto.category) : undefined,
    nodes: (dto.nodes ?? []).map(mapNodeDto),
    links: (dto.links ?? []).map(mapLinkDto),
    coverUrl: dto.cover_url ?? null,
    editVersion: dto.edit_version,
    viewCount: dto.view_count ?? 0,
    props: normalizeAdventureProps(dto.props),
    users: (dto.users ?? []).map(mapUserDto),
  };
}

export function parseNodeDto(input: unknown): ParseResult<NodeModel> {
  const result = nodeDtoSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: "Node DTO validation failed", issues: result.error.issues };
  }
  return { ok: true, data: mapNodeDto(result.data) };
}

export function parseLinkDto(input: unknown): ParseResult<LinkModel> {
  const result = linkDtoSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: "Link DTO validation failed", issues: result.error.issues };
  }
  return { ok: true, data: mapLinkDto(result.data) };
}

export function parseAdventureDto(input: unknown): ParseResult<AdventureModel> {
  const result = adventureDtoSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: "Adventure DTO validation failed", issues: result.error.issues };
  }
  return { ok: true, data: mapAdventureDto(result.data) };
}
