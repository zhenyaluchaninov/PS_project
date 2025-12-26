import type {
  AdventureModel,
  AdventurePropsModel,
  CategoryModel,
  LinkModel,
  NodeModel,
  UserModel,
} from "@/domain/models";
import type {
  AdventureDto,
  CategoryDto,
  LinkDto,
  NodeDto,
  UserDto,
} from "@/domain/dto";
import { serializeProps } from "./propsEditing";

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toInt = (value: number): number =>
  Number.isFinite(value) ? Math.round(value) : 0;

const sanitizeStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const entries = value.filter((item) => typeof item === "string");
  return entries.length > 0 ? entries : null;
};

const serializePropsValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (isPlainRecord(value)) return serializeProps(value);
  return null;
};

const normalizeAdventureProps = (
  props: AdventurePropsModel | null
): Record<string, unknown> | null => {
  if (!props) return null;
  const record: Record<string, unknown> = { ...props };
  const fontList = sanitizeStringArray(record.fontList);
  if (fontList && !Array.isArray(record.font_list)) {
    record.font_list = fontList;
  }
  return record;
};

const mapCategory = (category?: CategoryModel | null): CategoryDto | undefined =>
  category
    ? {
        id: category.id,
        sort_order: category.sortOrder ?? undefined,
        title: category.title,
        description: category.description ?? undefined,
        icon: category.icon,
        image: category.image ?? undefined,
      }
    : undefined;

const mapUser = (user: UserModel): UserDto => ({
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
  created_at: user.createdAt ?? undefined,
  updated_at: user.updatedAt ?? undefined,
});

const mapNode = (node: NodeModel): NodeDto => ({
  id: node.id,
  node_id: node.nodeId,
  title: node.title,
  icon: node.icon ?? "",
  text: node.text,
  x: toInt(node.position.x),
  y: toInt(node.position.y),
  image_url: node.image.url ?? "",
  image_id: node.image.id ?? 0,
  image_layout_type: node.image.layoutType ?? "",
  type: node.type ?? "",
  changed: node.changed || undefined,
  props: serializePropsValue(node.rawProps ?? node.props ?? null) ?? "",
});

const mapLink = (link: LinkModel): LinkDto => ({
  id: link.id,
  link_id: link.linkId,
  source: link.source,
  source_title: link.sourceTitle ?? "",
  target: link.target,
  target_title: link.targetTitle ?? "",
  type: link.type,
  changed: link.changed || undefined,
  props: serializePropsValue(link.props ?? null) ?? "",
});

export const buildAdventureDto = (
  adventure: AdventureModel,
  editVersion: number
): AdventureDto => ({
  id: adventure.id,
  title: adventure.title,
  description: adventure.description ?? "",
  slug: adventure.slug,
  view_slug: adventure.viewSlug,
  locked: adventure.locked,
  created_at: adventure.createdAt ?? undefined,
  updated_at: adventure.updatedAt ?? undefined,
  category: mapCategory(adventure.category),
  nodes: adventure.nodes.map(mapNode),
  links: adventure.links.map(mapLink),
  image_id: adventure.imageId ?? 0,
  cover_url: adventure.coverUrl ?? "",
  edit_version: editVersion,
  view_count: adventure.viewCount ?? 0,
  props: serializePropsValue(normalizeAdventureProps(adventure.props)) ?? "",
  users: adventure.users.map(mapUser),
});

export const mergeServerAdventureIds = (
  current: AdventureModel,
  saved: AdventureModel
): AdventureModel => {
  const nodeIdMap = new Map(saved.nodes.map((node) => [node.nodeId, node.id]));
  const linkIdMap = new Map(saved.links.map((link) => [link.linkId, link.id]));

  let nodesChanged = false;
  const nodes = current.nodes.map((node) => {
    const serverId = nodeIdMap.get(node.nodeId);
    if (serverId !== undefined && serverId !== node.id) {
      nodesChanged = true;
      return { ...node, id: serverId };
    }
    return node;
  });

  let linksChanged = false;
  const links = current.links.map((link) => {
    const serverId = linkIdMap.get(link.linkId);
    if (serverId !== undefined && serverId !== link.id) {
      linksChanged = true;
      return { ...link, id: serverId };
    }
    return link;
  });

  const nextUpdatedAt = saved.updatedAt ?? current.updatedAt;
  const nextViewCount = saved.viewCount ?? current.viewCount;
  const nextLocked = saved.locked ?? current.locked;
  const shouldUpdateMeta =
    nextUpdatedAt !== current.updatedAt ||
    nextViewCount !== current.viewCount ||
    nextLocked !== current.locked;

  if (!nodesChanged && !linksChanged && !shouldUpdateMeta) {
    return current;
  }

  return {
    ...current,
    nodes: nodesChanged ? nodes : current.nodes,
    links: linksChanged ? links : current.links,
    updatedAt: nextUpdatedAt,
    viewCount: nextViewCount,
    locked: nextLocked,
  };
};
