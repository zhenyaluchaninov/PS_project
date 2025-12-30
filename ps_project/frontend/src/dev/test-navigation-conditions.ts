import assert from "node:assert/strict";
import type { NodeModel } from "../domain/models";
import { isLinkConditioned } from "../features/player/utils/navigationConditions";

const makeNode = (
  nodeId: number,
  rawProps: Record<string, unknown> = {},
  props: Record<string, unknown> | null = null
): NodeModel => ({
  id: nodeId,
  nodeId,
  title: `Node ${nodeId}`,
  text: "",
  icon: null,
  position: { x: 0, y: 0 },
  image: { url: null, id: null, layoutType: null },
  type: "default",
  changed: false,
  props,
  rawProps,
});

{
  const linkProps = { positiveNodeList: [2, 3] };
  assert.equal(
    isLinkConditioned({
      linkProps,
      targetNode: null,
      visitedNodes: new Set([2]),
    }),
    true
  );
  assert.equal(
    isLinkConditioned({
      linkProps,
      targetNode: null,
      visitedNodes: new Set([2, 3]),
    }),
    false
  );
}

{
  const linkProps = { negativeNodeList: ["4", "5"] };
  assert.equal(
    isLinkConditioned({
      linkProps,
      targetNode: null,
      visitedNodes: new Set([4]),
    }),
    false
  );
  assert.equal(
    isLinkConditioned({
      linkProps,
      targetNode: null,
      visitedNodes: new Set([4, 5]),
    }),
    true
  );
}

{
  const targetNode = makeNode(9, { node_conditions: ["hide_visited"] });
  assert.equal(
    isLinkConditioned({
      linkProps: null,
      targetNode,
      visitedNodes: new Set([9]),
    }),
    true
  );
  assert.equal(
    isLinkConditioned({
      linkProps: null,
      targetNode,
      visitedNodes: new Set([1]),
    }),
    false
  );
}

{
  const linkProps = { positive_node_list: "[7, 8]" };
  assert.equal(
    isLinkConditioned({
      linkProps,
      targetNode: null,
      visitedNodes: new Set([7]),
    }),
    true
  );
  assert.equal(
    isLinkConditioned({
      linkProps,
      targetNode: null,
      visitedNodes: new Set([7, 8]),
    }),
    false
  );
}

{
  const targetNode = makeNode(12, {}, { node_conditions: ["hide_visited"] });
  assert.equal(
    isLinkConditioned({
      linkProps: null,
      targetNode,
      visitedNodes: new Set([12]),
    }),
    true
  );
}

console.log("navigation condition tests passed");
