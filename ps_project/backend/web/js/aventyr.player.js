// DOM Entrypoint
document.addEventListener("DOMContentLoaded", onLoad);

// App root object
var app = window.app || {};
window.app = app;

// Application entry point
function onLoad() {
  // Model encapsulates data for a project
  app.model = new Model();
  app.model.onChange = modelDidChange;

  app.viewer = new Viewer();
  app.viewer.didPressLink = didPressLink;
  app.viewer.getNodeByID = getNodeByID;

  app.scrollytell = new Scrollytell();

  app.visitedHistory = [];
  app.historyIndex = 0;
}

function loadAdventure(adventureGUID, variant) {
  if (standAlonePlayer) {
    app.model.loadStandalone(adventureGUID).then((x) => startPlayer(x));
    return;
  }

  app.model.load(adventureGUID);
}

function modelDidChange(type, action, object) {
  if (type == "model" && action == "load") {
    startPlayer(object);
  }
}

function startPlayer(adventure) {
  var rootNode = app.model.getRootNode();

  var url = new URL(window.location.href);
  var nodeId = url.searchParams.get("nodeId");
  if (nodeId) {
    rootNode = app.model.getNodeByID(Number(nodeId));
  }

  app.viewer.setAdventureContent(adventure.props);

  var links = app.model.getLinksByNodeID(rootNode.node_id);
  app.viewer.setNodeContent(rootNode, links);

  app.visitedHistory.push(rootNode.node_id);

  window.addEventListener("keydown", (event) => {
    switch (event.code) {
      case "ArrowLeft":
        didPressBack();
        break;
      case "ArrowRight":
        if (app.historyIndex >= app.visitedHistory.length - 1) break;
        var nextNode = app.visitedHistory[++app.historyIndex];
        didPressLink(nextNode, true);
        break;
    }
    if (event.code.startsWith("Digit")) {
      var i = event.code[5];
      didPressLink(app.viewer.buttonNodeIds[i - 1]);
    }
  });
}

function canPressBack() {
  return app.historyIndex > 0;
}

function hasLinks() {
  return app.viewer.targetNodeIds.length > 0;
}

function didPressBack() {
  if (!canPressBack()) return;
  var prevNode = app.visitedHistory[--app.historyIndex];
  didPressLink(prevNode, true);
}

function didPressFirstLink() {
  didPressLink(app.viewer.targetNodeIds[0]);
}

function didPressLink(nodeId, navigate) {
  var node = app.model.getNodeByID(nodeId);
  if (node == null) {
    return;
  }
  var links = app.model.getLinksByNodeID(nodeId);

  if (!navigate) {
    app.historyIndex++;
    app.visitedHistory = app.visitedHistory.slice(0, app.historyIndex);
    app.visitedHistory.push(node.node_id);
  }

  app.viewer.setNodeContent(node, links);
}

function getProgressionNodes() {
  return app.model.getProgressionNodes();
}

function didStatisticsNode(nodeId) {
  app.model.setPlayerStatistics(nodeId, () => true);
}

function getNodeByID(nodeId) {
  return app.model.getNodeByID(nodeId);
}

function debugShow() {
  const dbugdiv = document.getElementById("debug_print");
  dbugdiv.hidden = false;
}
function debugWrite(text) {
  const dbugdiv = document.getElementById("debug_print");
  dbugdiv.innerHTML += text + "<br>";
}
function debugOverWrite(text) {
  const dbugdiv = document.getElementById("debug_print");
  dbugdiv.innerHTML = text + "<br>";
}
