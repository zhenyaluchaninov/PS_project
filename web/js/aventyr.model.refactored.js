/**
 * Model
 * aventyr.model.js
 *
 * Model class is responsible for holding the current state of an adventure.
 * Its also responsible for fetching and sending the adventure to persistent
 * storage on the server .
 *
 */

/**
 * Constructor
 */
function Model() {
  this.storage = new Storage();
  this.storage.didSave = this.didSave.bind(this);
  this.data = {};
  this.data.nodes = [];
  this.data.links = [];
  this.model = {};
}

/**
 * Model.prototype.load - Loads a model from storage
 *
 * @param {string} modelID Contains the GUID for the adventure
 * @param {function} callback Reference to callback that should receive adventure data
 */
Model.prototype.load = function(guid) {
  let that = this
  this.model.guid = guid;
  this.storage.load(guid, function(data) {
    if (data != null) {
      that.data = data;
      that.update("model", "load", that.data);
    }
  });
}

/**
 * Model.prototype.save - Saves a model to storage
 */
Model.prototype.save = function() {
  // Create a deep copy of models current payload
  var dataCopy = JSON.parse(JSON.stringify(this.data));

  // Pass copy to storage
  this.storage.set(this.model.guid, dataCopy, true);
}

/**
 * Model.prototype.didSave - Invoked when the model has been saved
 * @param  {json} data Payload containing the response from the server
 */
Model.prototype.didSave = function(data) {
  // console.log("Did Save", data);
  this.data = data;
  // Clear all "changed" properties
  this.clearChanges();
}

Model.prototype.clearChanges = function() {
  // Remove all "changed" properties
  // A changed property means that the underlying object has been changed by the user or the application

  // Nodes
  for (var i = 0; i < this.data.nodes.length; i++) {
    node = this.data.nodes[i];
    if (node.changed) {
      delete node.changed;
      this.data.nodes[i] = node;
    }
  }

  // Links
  for (var i = 0; i < this.data.links.length; i++) {
    link = this.data.links[i];
    if (link.changed) {
      delete link.changed;
      this.data.links[i] = link;
    }
  }
}

Model.prototype.update = function(type, action, obj) {
  this.save();

  if (this.onChange) {
    this.onChange(type, action, obj);
  }
}

Model.prototype.getRootNode = function() {
  for (var i = 0; i < this.data.nodes.length; i++) {
    if (this.data.nodes[i].type == "root") {
      return this.data.nodes[i];
    }
  }
  return nil;
}

Model.prototype.updateAdventure = function(adventure) {
  this.data.title = adventure.title;
  this.data.description = adventure.description;
  this.data.category = adventure.category;

  this.update("adventure", "update", adventure);
}

Model.prototype.updateNode = function(nodeData) {
  var index = this.getNodeIndexByID(nodeData.node_id);
  nodeData.changed = true;
  this.data.nodes[index] = nodeData;
  this.update("node", "update", this.data.nodes[index]);
}

Model.prototype.updateLink = function(linkData) {
  var index = this.getLinkIndexByID(linkData.link_id);
  linkData.changed = true;
  this.data.links[index] = linkData;
  this.update("link", "update", this.data.links[index]);
}

Model.prototype.addNode = function(parentNodeID) {
  // Create new node
  var newNode = {};
  newNode.node_id = this.getNewNodeID();
  newNode.title = "#" + newNode.node_id;
  newNode.text = "";
  newNode.type = "default";
  newNode.parent = parentNodeID;
  this.data.nodes.push(newNode);

  // Create new link
  var newLink = {};
  newLink.link_id = this.getNewLinkID();
  newLink.source_title = "";
  newLink.target_title = "";
  newLink.source = parentNodeID;
  newLink.target = newNode.node_id;
  newLink.type = "default";
  this.data.links.push(newLink);

  // Pass new link with node object
  var data = {};
  data.link = newLink;
  data.node = newNode;

  this.update("node", "add", data);
}

Model.prototype.removeImage = function(imageURL, callback) {
  this.update("image", "delete");

  this.storage.deleteImage(this.model.guid, imageURL, callback);
};

Model.prototype.removeNode = function(nodeID) {
  var nodeIndex = this.getNodeIndexByID(nodeID);
  if (nodeIndex != -1) {
    var node = this.data.nodes[nodeIndex];

    // Aggregate links to remove
    var linksToRemove = [];
    for (var i = 0; i < this.data.links.length; i++) {
      var link = this.data.links[i];
      if ((link.source == node.node_id) || (link.target == node.node_id)) {
        linksToRemove.push(link);
      }
    }

    // Delete links from model
    while (linksToRemove.length > 0) {
      var link = linksToRemove[0];
      linksToRemove.splice(0, 1);
      this.removeLink(link);
    }

    this.data.nodes.splice(nodeIndex, 1);
    this.update("node", "delete", node);
  }
}

Model.prototype.removeLink = function(link) {
  var index = this.getLinkIndexByID(link.link_id);
  if (index != -1) {
    var link = this.data.links[index];
    this.data.links.splice(index, 1);
    this.update("link", "delete", link);
  }
}

Model.prototype.getNodeIndexByID = function(nodeID) {
  for (var i = 0; i < this.data.nodes.length; i++) {
    var node = this.data.nodes[i];
    if (node.node_id == nodeID) {
      return i;
    }
  }
  return -1;
}

Model.prototype.getNodeByID = function(nodeID) {
  for (var i = 0; i < this.data.nodes.length; i++) {
    var node = this.data.nodes[i];
    if (node.node_id == nodeID) {
      return node;
    }
  }
  return null;
}

Model.prototype.getCategories = function() {
  let that = this;
  this.storage.getCategories(function(data) {
    that.update("categories", "load", data);
  });
}

Model.prototype.addLink = function(sourceNodeID, targetNodeID) {

  var sourceNode = this.getNodeByID(sourceNodeID);
  var targetNode = this.getNodeByID(targetNodeID);

  if (sourceNode == null) {
    // console.log("Source node doesnt exist: ", sourceNodeID);
    return null;
  }

  if (targetNode == null) {
    // console.log("Target node doesnt exist: ", targetNodeID);
    return null;
  }

  var newLink = {};
  newLink.link_id = this.getNewLinkID();
  newLink.source = sourceNodeID;
  newLink.target = targetNodeID;
  newLink.source_title = "";
  newLink.target_title = "";
  newLink.type = "default";
  this.data.links.push(newLink);

  this.update("link", "add", newLink);

  return newLink;
}

Model.prototype.getLinkIndexBySourceAndTargetNodeID = function(sourceNodeID, targetNodeID) {
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if ((link.source == sourceNodeID) && (link.target == targetNodeID)) {
      return i;
    }
  }
  return -1;
}

Model.prototype.getPossibleNodeTargetsByNodeID = function(nodeID) {

  var possibleTargets = [];

  // Get all links where selected node is source/target
  var targetLinks = this.getLinksByNodeID(nodeID);
  var notPermittedLinkIDs = [];
  // console.log("Target links", targetLinks);

  // Iterate over all target links
  for (var i = 0; i < targetLinks.length; i++) {
    // Get link
    var link = targetLinks[i];
    if (!notPermittedLinkIDs.includes(link.source)) {
      notPermittedLinkIDs.push(link.source);
    }
    if (!notPermittedLinkIDs.includes(link.target)) {
      notPermittedLinkIDs.push(link.target);
    }
  }
  for (var i = 0; i < this.data.nodes.length; i++) {
    var node = this.data.nodes[i];
    if (!notPermittedLinkIDs.includes(node.node_id)) {
      possibleTargets.push(node);
    }
  }
  // console.log("Not permitted targets", notPermittedLinkIDs);

  return possibleTargets;
}

Model.prototype.getLinksByNodeID = function(nodeID) {
  var links = [];
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if ((link.source == nodeID) || (link.target == nodeID)) {
      links.push(link);
    }
  }
  return links;
}

Model.prototype.getLinkIndexByID = function(linkID) {
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (link.link_id == linkID) {
      return i;
    }
  }
  return -1;
}

Model.prototype.getLinkByID = function(linkID) {
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (link.link_id == linkID) {
      return link;
    }
  }
  return null;
}

Model.prototype.getNewLinkID = function() {
  var newLinkID = -1;
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (newLinkID <= link.link_id) {
      newLinkID = link.link_id + 1;
    }
  }
  return newLinkID;
}

Model.prototype.getNewNodeID = function() {
  var newNodeID = -1;
  for (var i = 0; i < this.data.nodes.length; i++) {
    var node = this.data.nodes[i];
    if (newNodeID <= node.node_id) {
      newNodeID = node.node_id + 1;
    }
  }
  return newNodeID;
}

Model.prototype.uploadImage = function(imageData, callback) {
  this.update("image", "upload");

  this.storage.uploadImage(imageData, callback);
};