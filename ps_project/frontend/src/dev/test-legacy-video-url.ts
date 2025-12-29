import assert from "node:assert/strict";
import type { AdventureModel, NodeModel } from "../domain/models";
import { buildAdventureDto } from "../features/editor/state/adventureSerialization";

const baseAdventure: AdventureModel = {
  id: 1,
  title: "Test Adventure",
  description: "",
  slug: "test-adventure",
  viewSlug: "test-adventure",
  locked: false,
  nodes: [],
  links: [],
  editVersion: 1,
  viewCount: 0,
  props: null,
  users: [],
};

const makeNode = (overrides: Partial<NodeModel>): NodeModel => ({
  id: 1,
  nodeId: 1,
  title: "Node 1",
  text: "",
  icon: null,
  position: { x: 0, y: 0 },
  image: { url: null, id: null, layoutType: null },
  type: "default",
  changed: false,
  props: null,
  rawProps: null,
  ...overrides,
});

const buildNodeDto = (node: NodeModel) =>
  buildAdventureDto(
    { ...baseAdventure, nodes: [node] },
    baseAdventure.editVersion
  ).nodes[0];

{
  const node = makeNode({
    image: { url: "/upload/x/video.mp4?v=123", id: null, layoutType: null },
    rawProps: { settings_chapterType: ["videoplayer-node"] },
  });
  const dto = buildNodeDto(node);
  assert.equal(dto.image_url, "/upload/x/video.mp4");
}

{
  const node = makeNode({
    image: { url: "/upload/x/video.MP4?cache=1", id: null, layoutType: null },
    rawProps: { settings_chapterType: ["videoplayer-node"] },
  });
  const dto = buildNodeDto(node);
  assert.equal(dto.image_url, "/upload/x/video.MP4");
}

{
  const node = makeNode({
    image: { url: "/upload/x/pic.jpg?v=1", id: null, layoutType: null },
    rawProps: { settings_chapterType: ["chapter-node"] },
  });
  const dto = buildNodeDto(node);
  assert.equal(dto.image_url, "/upload/x/pic.jpg?v=1");
}

console.log("legacy video url normalization tests passed");
