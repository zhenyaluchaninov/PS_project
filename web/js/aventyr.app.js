// DOM Entrypoint
document.addEventListener("DOMContentLoaded", onLoad);

// App root object
var app = window.app || {};
window.app = app;

standAlonePlayer = false;

// Application entry point
function onLoad() {
  // Window
  window.addEventListener("resize", onResize);
  window.addEventListener("beforeunload", onBeforeUnload);

  // Model encapsulates data for a project
  app.model = new Model();
  app.model.onChange = modelDidChange;
  app.model.onSave = modelDidSave;
  app.model.getCategories();
  app.model.getImageCategories();

  // Editor
  app.editor = new Editor("area_node", "area_link", "area_adventure");
  app.editor.didPressAddNode = didPressAddNode;
  app.editor.didPressAddLink = didPressAddLink;
  app.editor.didPressDeleteMedia = didPressDeleteMedia;
  app.editor.didPressDeleteNode = didPressDeleteNode;
  app.editor.didPressDeleteLink = didPressDeleteLink;
  app.editor.didPressChangeDirection = didPressChangeDirection;
  app.editor.getTargetsByNode = getTargetsByNode;
  app.editor.getAllNodeIds = getAllNodeIds;
  app.editor.didEditAdventure = didEditAdventure;
  app.editor.didEditImage = didEditImage;
  app.editor.didEditAudio = didEditAudio;
  app.editor.didEditNode = didEditNode;
  app.editor.didEditLink = didEditLink;
  app.editor.didPressPreviewNode = didPressPreviewNode;
  app.editor.getCategories = getCategories;
  app.editor.didChangeImageCategory = didChangeImageCategory;
  app.editor.didSelectImageInGallery = didSelectImageInGallery;
  app.editor.didSelectCoverImageInGallery = didSelectCoverImageInGallery;
  app.editor.getSelectedNodeIds = getSelectedNodeIds;
  app.editor.didPressNewAdventure = didPressNewAdventure;
  app.editor.toggle();

  // Graph component
  app.graph = new Graph("graph");
  app.graph.didTapNode = didTapNode;
  app.graph.didDblTapNode = didDblTapNode;
  app.graph.didTapLink = didTapLink;
  app.graph.didTapBackground = didTapBackground;
  app.graph.didMoveNode = didMoveNode;
  app.graph.init();
}

function didPressPreviewNode(nodeId) {
  var node = app.model.getNodeByID(nodeId);
  var links = app.model.getLinksByNodeID(nodeId);
  app.viewer.setNodeContent(node, links);
}

function getNodeByID(nodeId) {
  return app.model.getNodeByID(nodeId);
}

function redirectUrl(path) {
  const port = window.location.port ? ":" + window.location.port : "";
  return window.location.protocol + "//" + window.location.hostname + port + "/" + path;
}

function loadAdventure(adventureGUID) {
  app.model.load(adventureGUID, () => {
    window.location.assign(redirectUrl("admin/"));
    return;
  });
}

function didPressNewAdventure() {
  app.model.newAdventure((adventure) => {
    window.open(redirectUrl("redigera/" + adventure.slug));
  });
}

// When window/browser is resized
function onResize() {
  app.graph.updateView();
}

// When user want to surf to another page
function onBeforeUnload(event) {
  // If there are changes in current adventure
  if (app.model.hasChanges()) {
    // Attempt to perform save
    app.model.save();
    // ..and warn user
    event.returnValue = "Du har osparade ändringar som kommer gå förlorade, tryck avbryt och vänta 3 sekunder!";
  }
}

// This method is called everytime changes are made on the model
// Its responsibility is to update the graph UI
function modelDidChange(type, action, object) {
  if (type == "model" && action == "load") {
    app.graph.load(object);
    app.editor.updateAdventure(object);
  }

  if (type == "node" && action == "update") {
    app.graph.updateNode(object.node_id, object);
  }

  if (type == "node" && action == "add") {
    var link = object.link;
    var node = object.node;
    app.graph.addNode(node, link.link_id);
    app.graph.deselectNode(node.parent);
    app.graph.selectNode(node.node_id);
  }

  if (type == "node" && action == "delete") {
    app.graph.deleteNode(object.node_id);
  }

  if (type == "link" && action == "add") {
    app.graph.addLink(object.link_id, object.source, object.target);
  }

  if (type == "link" && action == "delete") {
    app.graph.deleteLink(object.link_id);
  }

  if (type == "link" && action == "update") {
    app.graph.updateLink(object.link_id, object.type, object.source, object.target);
  }

  if (type == "adventure" && action == "update") {
    app.editor.updateAdventure(object);
  }

  if (type == "categories" && action == "load") {
    app.editor.updateCategories(object);
  }

  if (type == "imagecategories" && action == "load") {
    app.editor.updateImageCategories(object);
  }

  if (type == "images" && action == "load") {
    app.editor.updateImages(object);
  }

  if (type == "image" && action == "load") {
    app.editor.setSelectedImage(object);
  }

  if (type == "cover_image" && action == "load") {
    app.editor.setSelectedCoverImage(object);
  }
}

// Callback from the model, when the model has been persisted to localstorage/server
function modelDidSave() {
  app.editor.lockEditor();

  // Toastify({
  //   text: "Äventyret låst! Uppdatera för att hämta senaste!",
  //   duration: 2000,
  //   gravity: "bottom", // `top` or `bottom`
  //   position: "left", // `left`, `center` or `right`
  //   backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
  //   onClick: function () {}, // Callback after click
  // }).showToast();
}

function didEditAdventure(adventure) {
  app.model.updateAdventure(adventure);
}

function didEditImage(imageData, callback) {
  app.model.uploadMedia(imageData, callback);
}

function didEditAudio(audioData, callback) {
  app.model.uploadMedia(audioData, callback);
}

function didChangeImageCategory(categoryID) {
  app.model.getImagesInCategory(categoryID);
}

function didSelectImageInGallery(imageID) {
  app.model.getImage(imageID);
}

function didSelectCoverImageInGallery(imageID) {
  app.model.setCoverImage(imageID);
}

// User edited node data in the editor
function didEditNode(node) {
  app.model.updateNode(node);
}

// User edited link data in the editor
function didEditLink(link) {
  app.model.updateLink(link);
}

// User tapped a node in the graph
function didTapNode(nodeID) {
  // Get Node model
  var tappedNode = app.model.getNodeByID(nodeID);

  // If its the root node, prevent deletion
  var isDelete = tappedNode.type == "root" ? false : true;

  // Pass node to editor
  app.editor.editNode(tappedNode, isDelete);
}

function didDblTapNode(nodeID) {
  var tappedNode = app.model.getNodeByID(nodeID);
  app.editor.selectNode(tappedNode);
}

// User tapped a link in the graph
function didTapLink(linkID) {
  // Get link model
  var tappedLink = app.model.getLinkByID(linkID);

  var sourceNode = app.model.getNodeByID(tappedLink.source);
  var targetNode = app.model.getNodeByID(tappedLink.target);

  // Pass to editor
  app.editor.editLink(tappedLink, true, sourceNode, targetNode);
}

// User tapped background of graph component
// Remove selection and hide all editors
function didTapBackground() {
  // Hide editor
  app.editor.toggle();
}

// Called when the user drags a node
function didMoveNode(nodeID, x, y) {
  var movedNode = app.model.getNodeByID(nodeID);
  movedNode.x = x;
  movedNode.y = y;
  app.model.updateNode(movedNode);
}

// Returns possible targets for a specific node
function getTargetsByNode(node) {
  // Return possible target nodes for node with 'nodeId'
  return app.model.getPossibleNodeTargetsByNodeID(node.node_id);
}

function getAllNodeIds() {
  return app.model.getAllNodeIds();
}

function getSelectedNodeIds() {
  return app.graph.getSelectedNodeIds();
}

function getCategories(callback) {
  return app.model.getCategories(callback);
}

// User clicked the "add node" button in the node editor
function didPressAddNode(parentNode) {
  app.model.addNode(parentNode);
}

function didPressAddHint(instance) {
  // TODO: Implement this
}

// User clicked the "add link" button in the node editor
function didPressAddLink(source, target) {
  app.model.addLink(source, target);
}

// User clicked delete image in node editor
function didPressDeleteMedia(url, callback) {
  app.model.removeMedia(url, callback);
}

// User clicked delete node in node editor
function didPressDeleteNode(node) {
  app.model.removeNode(node.node_id);
}

// User clicked delete link in link editor
function didPressDeleteLink(link) {
  app.model.removeLink(link);
}

// User clicked "change direction" in the link editor
function didPressChangeDirection(link) {
  // Copy link
  var updatedLink = Object.assign({}, link);

  // Pass values from origin object to new object
  updatedLink.source = link.target;
  updatedLink.source_title = link.target_title;
  updatedLink.target = link.source;
  updatedLink.target_title = link.source_title;

  // console.log("Original link", link);
  // console.log("Changed link ", updatedLink);

  app.model.updateLink(updatedLink);

  var sourceNode = app.model.getNodeByID(updatedLink.source);
  var targetNode = app.model.getNodeByID(updatedLink.target);

  // Pass to editor
  app.editor.editLink(updatedLink, true, sourceNode, targetNode);
}

