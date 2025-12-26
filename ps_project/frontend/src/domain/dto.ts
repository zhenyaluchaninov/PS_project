import { z } from "zod";

const propsInputSchema = z
  .union([z.string(), z.record(z.string(), z.unknown()), z.null()])
  .optional();

export const categoryDtoSchema = z.object({
  id: z.coerce.number(),
  sort_order: z.coerce.number().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
  icon: z.string(),
  image: z.string().optional().nullable(),
});

export const userDtoSchema = z.object({
  id: z.coerce.number(),
  username: z.string(),
  name: z.string(),
  role: z.coerce.number(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  adventures: z.array(z.unknown()).optional(),
});

export const nodeDtoSchema = z.object({
  id: z.coerce.number(),
  node_id: z.coerce.number(),
  title: z.string(),
  icon: z.string().optional().nullable(),
  text: z.string(),
  x: z.coerce.number().optional().nullable(),
  y: z.coerce.number().optional().nullable(),
  image_url: z.string().optional().nullable(),
  image_id: z.coerce.number().optional().nullable(),
  image_layout_type: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  changed: z.boolean().optional(),
  props: propsInputSchema,
});

export const linkDtoSchema = z.object({
  id: z.coerce.number(),
  link_id: z.coerce.number(),
  source: z.coerce.number(),
  source_title: z.string().optional().nullable(),
  target: z.coerce.number(),
  target_title: z.string().optional().nullable(),
  type: z.string(),
  changed: z.boolean().optional(),
  props: propsInputSchema,
});

export const adventureDtoSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string().optional().nullable().default(""),
  slug: z.string().optional().default(""),
  view_slug: z.string(),
  locked: z.boolean().optional().default(false),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  category: categoryDtoSchema.optional().nullable(),
  nodes: z.array(nodeDtoSchema).optional().default([]),
  links: z.array(linkDtoSchema).optional().default([]),
  image_id: z.coerce.number().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  edit_version: z.coerce.number(),
  view_count: z.coerce.number().default(0),
  props: propsInputSchema,
  users: z.array(userDtoSchema).optional().default([]),
});

export type CategoryDto = z.infer<typeof categoryDtoSchema>;
export type UserDto = z.infer<typeof userDtoSchema>;
export type NodeDto = z.infer<typeof nodeDtoSchema>;
export type LinkDto = z.infer<typeof linkDtoSchema>;
export type AdventureDto = z.infer<typeof adventureDtoSchema>;
