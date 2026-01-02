import assert from "node:assert/strict";
import type { LinkModel, NodeModel } from "../domain/models";
import { decideOnClick } from "../features/player/engine/playerEngine";

const makeNode = (
  nodeId: number,
  text = "",
  rawProps: Record<string, unknown> = {}
): NodeModel => ({
  id: nodeId,
  nodeId,
  title: `Node ${nodeId}`,
  text,
  icon: null,
  position: { x: 0, y: 0 },
  image: { url: null, id: null, layoutType: null },
  type: "default",
  changed: false,
  props: null,
  rawProps,
});

const makeLink = (linkId: number, fromNodeId: number, toNodeId: number): LinkModel => ({
  id: linkId,
  linkId,
  source: fromNodeId,
  target: toNodeId,
  fromNodeId,
  toNodeId,
  label: `Link ${linkId}`,
  type: "default",
  changed: false,
  props: null,
});

{
  const nodes = {
    1: makeNode(1),
    2: makeNode(2),
  };
  const link = makeLink(10, 1, 2);
  const decision = decideOnClick(link.linkId, {
    nodes,
    linksBySource: {},
    linksById: { [link.linkId]: link },
    visited: new Set(),
    currentNodeId: 1,
  });

  assert.equal(decision.type, "move");
  if (decision.type === "move") {
    assert.equal(decision.nodeId, 2);
  }
}

{
  const nodes = {
    1: makeNode(1),
    3: makeNode(3, "Learn more at https://example.com", {
      settings_chapterType: "ref-node",
    }),
  };
  const link = makeLink(11, 1, 3);
  const decision = decideOnClick(link.linkId, {
    nodes,
    linksBySource: {},
    linksById: { [link.linkId]: link },
    visited: new Set(),
    currentNodeId: 1,
  });

  assert.equal(decision.type, "open-reference");
  if (decision.type === "open-reference") {
    assert.equal(decision.url, "https://example.com");
    assert.equal(decision.openInNewTab, false);
    assert.equal(decision.targetNodeId, 3);
  }
}

{
  const nodes = {
    1: makeNode(1),
    4: makeNode(4, "Open https://example.com/docs", {
      settings_chapterType: "ref-node-tab",
    }),
  };
  const link = makeLink(12, 1, 4);
  const decision = decideOnClick(link.linkId, {
    nodes,
    linksBySource: {},
    linksById: { [link.linkId]: link },
    visited: new Set(),
    currentNodeId: 1,
  });

  assert.equal(decision.type, "open-reference");
  if (decision.type === "open-reference") {
    assert.equal(decision.url, "https://example.com/docs");
    assert.equal(decision.openInNewTab, true);
    assert.equal(decision.targetNodeId, 4);
  }
}

{
  const nodes = {
    1: makeNode(1),
    5: makeNode(5, "No link here", {
      settings_chapterType: "ref-node",
    }),
  };
  const link = makeLink(13, 1, 5);
  const decision = decideOnClick(link.linkId, {
    nodes,
    linksBySource: {},
    linksById: { [link.linkId]: link },
    visited: new Set(),
    currentNodeId: 1,
  });

  assert.equal(decision.type, "error");
  if (decision.type === "error") {
    assert.equal(decision.error.title, "Missing link");
  }
}

console.log("player decision tests passed");
