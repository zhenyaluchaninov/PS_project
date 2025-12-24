"use client";

import {
  selectEditorAdventure,
  selectEditorNodeInspectorTab,
  selectEditorSelection,
  useEditorStore,
} from "../state/editorStore";
import {
  AdventureInspectorPanel,
  LinkInspectorPanel,
  NodeInspectorPanel,
} from "../panel/InspectorPanels";

export function EditorInspector() {
  const adventure = useEditorStore(selectEditorAdventure);
  const selection = useEditorStore(selectEditorSelection);
  const activeTab = useEditorStore(selectEditorNodeInspectorTab);
  const setActiveTab = useEditorStore((s) => s.setNodeInspectorTab);
  const updateNodeTitle = useEditorStore((s) => s.updateNodeTitle);
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps);

  if (!adventure) {
    return <div className="h-full" />;
  }

  const selectedNode =
    selection.type === "node"
      ? adventure.nodes.find((node) => node.nodeId === selection.nodeId)
      : null;
  const selectedLink =
    selection.type === "link"
      ? adventure.links.find((link) => link.linkId === selection.linkId)
      : null;

  if (selection.type === "node" && selectedNode) {
    return (
      <NodeInspectorPanel
        node={selectedNode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTitleChange={(title) => updateNodeTitle(selectedNode.nodeId, title)}
        onNodeTypeChange={(chapterType) =>
          updateNodeProps(selectedNode.nodeId, {
            settings_chapterType: [chapterType],
          })
        }
      />
    );
  }

  if (selection.type === "link" && selectedLink) {
    return <LinkInspectorPanel link={selectedLink} />;
  }

  return <AdventureInspectorPanel adventure={adventure} />;
}
