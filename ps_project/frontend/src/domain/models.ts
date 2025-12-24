export type AdventurePropsModel = {
  fontList: string[];
};

export type NodePropsModel = Record<string, unknown> & {
  audioUrl?: string | null;
  audioUrlAlt?: string | null;
  subtitlesUrl?: string | null;
};

export type CategoryModel = {
  id: number;
  sortOrder?: number | null;
  title: string;
  description?: string | null;
  icon: string;
  image?: string | null;
};

export type UserModel = {
  id: number;
  username: string;
  name: string;
  role: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NodeModel = {
  id: number;
  nodeId: number;
  title: string;
  text: string;
  icon?: string | null;
  position: { x: number; y: number };
  image: { url: string | null; id: number | null; layoutType: string | null };
  type: string | null;
  changed: boolean;
  props: NodePropsModel | null;
  rawProps: Record<string, unknown> | null;
};

export type LinkModel = {
  id: number;
  linkId: number;
  source: number; // legacy naming
  sourceTitle?: string | null;
  target: number; // legacy naming
  targetTitle?: string | null;
  fromNodeId: number;
  toNodeId: number;
  label?: string | null;
  type: string;
  changed: boolean;
  props: Record<string, unknown> | null;
};

export type AdventureModel = {
  id: number;
  title: string;
  description: string;
  slug: string;
  viewSlug: string;
  locked: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  category?: CategoryModel;
  nodes: NodeModel[];
  links: LinkModel[];
  coverUrl?: string | null;
  editVersion: number;
  viewCount: number;
  props: AdventurePropsModel | null;
  users: UserModel[];
};
