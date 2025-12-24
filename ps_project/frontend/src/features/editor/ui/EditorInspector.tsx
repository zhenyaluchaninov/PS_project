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
  const updateNodeText = useEditorStore((s) => s.updateNodeText);
  const setNodePropPath = useEditorStore((s) => s.setNodePropPath);
  const setNodePropStringArraySelect = useEditorStore(
    (s) => s.setNodePropStringArraySelect
  );

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
        fontList={adventure.props?.fontList}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTitleChange={(title) => updateNodeTitle(selectedNode.nodeId, title)}
        onTextChange={(text) => updateNodeText(selectedNode.nodeId, text)}
        onNodeTypeChange={(chapterType) =>
          setNodePropStringArraySelect(
            selectedNode.nodeId,
            "settings_chapterType",
            chapterType
          )
        }
        onNodePropChange={(path, value) =>
          setNodePropPath(selectedNode.nodeId, path, value)
        }
      />
    );
  }

  if (selection.type === "link" && selectedLink) {
    return <LinkInspectorPanel link={selectedLink} />;
  }

  return <AdventureInspectorPanel adventure={adventure} />;
}
