function Model() {
  if (!standAlonePlayer) {
    this.storage = new Storage();
    this.storage.didSave = this.didSave.bind(this);
  }
  this.data = {};
  this.data.nodes = [];
  this.data.links = [];
  this.model = {};
}

/**
 * Model.prototype.load - Loads a model from storage
 *
 * @param  {type} modelID Contains the GUID for the adventure
 */
Model.prototype.load = function (guid, onError) {
  let that = this;
  this.model.guid = guid;
  this.storage.load(guid, onError != undefined, function (data, error) {
    if (onError && error) {
      onError();
      return;
    }
    if (data != null) {
      that.data = data;
      if (onError) {
        that.update("model", "load", that.data);
      } else {
        that.onChange("model", "load", that.data);
      }
    }
  });
};

Model.prototype.loadStandalone = async function (guid) {
  const response = await fetch("PSadventure_" + guid + ".json");
  this.data = await response.json();
  return this.data;
};


Model.prototype.update = function (type, action, obj) {
  this.save();

  if (this.onChange) {
    this.onChange(type, action, obj);
  }
};

/**
 * Model.prototype.save - Saves a model to storage
 */
Model.prototype.save = function () {
  // Create a deep copy of models current payload
  var dataCopy = JSON.parse(JSON.stringify(this.data));

  // Pass copy to storage
  this.storage.set(this.model.guid, dataCopy, true);
};

/**
 * Model.prototype.didSave - Invoked when the model has been saved
 * @param  {json} data Payload containing the response from the server
 */
Model.prototype.didSave = function (result) {
  if (result.status == 423) {
    // Call callback to inform of locked adventure
    if (this.onSave) {
      this.onSave();
    }
    return;
  }

  this.data = result.response;
  // Clear all "changed" properties
  this.clearChanges();
};

Model.prototype.hasChanges = function () {
  // Nodes
  for (var i = 0; i < this.data.nodes.length; i++) {
    node = this.data.nodes[i];
    if (node.changed) {
      return true;
    }
  }

  // Links
  for (var i = 0; i < this.data.links.length; i++) {
    link = this.data.links[i];
    if (link.changed) {
      return true;
    }
  }

  return false;
};

Model.prototype.clearChanges = function () {
  // Remove all "changed" properties

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
};

Model.prototype.getRootNode = function () {
  for (var i = 0; i < this.data.nodes.length; i++) {
    if (this.data.nodes[i].type == "root") {
      return this.data.nodes[i];
    }
  }
  return nil;
};

Model.prototype.updateAdventure = function (adventure) {
  this.data.title = adventure.title;
  this.data.description = adventure.description;
  this.data.category = adventure.category;
  this.data.image_id = adventure.image_id;
  this.data.cover_url = adventure.cover_url;
  this.data.props = adventure.props;

  this.update("adventure", "update", adventure);
};

Model.prototype.updateNode = function (nodeData) {
  var index = this.getNodeIndexByID(nodeData.node_id);
  nodeData.changed = true;
  this.data.nodes[index] = nodeData;
  this.update("node", "update", this.data.nodes[index]);
};

Model.prototype.bulkUpdateNodes = function (nodeIds, values) {
  for (const id of nodeIds) {
    var index = this.getNodeIndexByID(id);
    var node = this.data.nodes[index];
    var props = JSON.parse(node.props);

    for (const [key, value] of Object.entries(values)) {
      props[key] = value;
    }

    node.props = JSON.stringify(props);
    node.changed = true;
  }
};

Model.prototype.updateLink = function (linkData) {
  var index = this.getLinkIndexByID(linkData.link_id);
  linkData.changed = true;
  this.data.links[index] = linkData;
  this.update("link", "update", this.data.links[index]);
};

/**
 * addNode, method for creating a new node
 * @param  {integer} parentNodeID Expects parent node object, which is utilized to relate and position the new node
 */
Model.prototype.addNode = function (parentNode) {
  // Create new node
  var newNode = {};
  newNode.node_id = this.getNewNodeID();
  newNode.title = "#" + newNode.node_id;
  newNode.text = "";
  newNode.type = "default";
  newNode.parent = parentNode.node_id;
  newNode.x = parentNode.x;
  newNode.y = parentNode.y + 200;
  newNode.props = "";
  this.data.nodes.push(newNode);

  // Create new link
  var newLink = {};
  newLink.link_id = this.getNewLinkID();
  newLink.source_title = "";
  newLink.target_title = "";
  newLink.source = parentNode.node_id;
  newLink.target = newNode.node_id;
  newLink.type = "default";
  this.data.links.push(newLink);

  // Pass new link with node object
  var data = {};
  data.link = newLink;
  data.node = newNode;

  this.update("node", "add", data);
};

Model.prototype.removeMedia = function (mediaURL, callback) {
  this.storage.deleteMedia(this.model.guid, mediaURL, callback);
};

Model.prototype.removeNode = function (nodeID) {
  var nodeIndex = this.getNodeIndexByID(nodeID);
  if (nodeIndex != -1) {
    var node = this.data.nodes[nodeIndex];

    // Aggregate links to remove
    var linksToRemove = [];
    for (var i = 0; i < this.data.links.length; i++) {
      var link = this.data.links[i];
      if (link.source == node.node_id || link.target == node.node_id) {
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
};

Model.prototype.removeLink = function (link) {
  var index = this.getLinkIndexByID(link.link_id);
  if (index != -1) {
    var link = this.data.links[index];
    this.data.links.splice(index, 1);
    this.update("link", "delete", link);
  }
};

Model.prototype.getNodeIndexByID = function (nodeID) {
  for (var i = 0; i < this.data.nodes.length; i++) {
    var node = this.data.nodes[i];
    if (node.node_id == nodeID) {
      return i;
    }
  }
  return -1;
};

Model.prototype.getNodeByID = function (nodeID) {
  for (var i = 0; i < this.data.nodes.length; i++) {
    var node = this.data.nodes[i];
    if (node.node_id == nodeID) {
      return node;
    }
  }
  return null;
};

Model.prototype.getCategories = function () {
  let that = this;
  this.storage.getCategories(function (data) {
    that.update("categories", "load", data);
  });
};

Model.prototype.getImageCategories = function () {
  let that = this;
  this.storage.getImageCategories(function (data) {
    that.update("imagecategories", "load", data);
  });
};

Model.prototype.getImagesInCategory = function (categoryID) {
  let that = this;
  this.storage.getImagesInCategory(categoryID, function (data) {
    that.update("images", "load", data);
  });
};

Model.prototype.getImage = function (imageID) {
  let that = this;
  this.storage.getImage(imageID, function (data) {
    that.update("image", "load", data);
  });
};

Model.prototype.setCoverImage = function (imageID) {
  let that = this;
  this.storage.getImage(imageID, function (data) {
    that.update("cover_image", "load", data);
  });
};

Model.prototype.addLink = function (sourceNodeID, targetNodeID) {
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
};

Model.prototype.getLinkIndexBySourceAndTargetNodeID = function (sourceNodeID, targetNodeID) {
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (link.source == sourceNodeID && link.target == targetNodeID) {
      return i;
    }
  }
  return -1;
};

Model.prototype.getAllNodeIds = function (nodeID) {
  return this.data.nodes.map((x) => x.node_id);
};

Model.prototype.getProgressionNodes = function () {
  return this.data.nodes.map((x) => ({ id: x.node_id, progression_value: 1 }));
};


Model.prototype.getPossibleNodeTargetsByNodeID = function (nodeID) {
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
};

Model.prototype.getLinksByNodeID = function (nodeID) {
  var links = [];
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (link.source == nodeID || link.target == nodeID) {
      links.push(link);
    }
  }
  return links;
};

Model.prototype.getOrderedTargetsByNode = function (node, ordered_link_ids) {
  var targets = [];
  for (var link of this.data.links) {
    var title = "";
    var node_target_id = 0;
    if (link.source == node.node_id) {
      title = link.target_title == "" ? this.getNodeByID(link.target).title : link.target_title;
      node_target_id = link.target;
    } else if (link.target == node.node_id && link.type == "bidirectional") {
      title = link.source_title == "" ? this.getNodeByID(link.source).title : link.source_title;
      node_target_id = link.source;
    } else continue;

    targets.push({ link_id: link.link_id, node_target_id: node_target_id, title: title, linkProps: link.props });
  }

  targets.push({ link_id: -1, node_target_id: node.node_id, title: node.title, linkProps: null });

  var ordered_targets = targets;
  if (ordered_link_ids) {
    ordered_targets = ordered_link_ids
      .map((x) => targets.find((y) => y.link_id == Number(x)))
      .filter((x) => x)
      .concat(targets.filter((x) => ordered_link_ids.every((y) => Number(y) != x.link_id)));
  }

  return ordered_targets;
};

Model.prototype.getLinkIndexByID = function (linkID) {
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (link.link_id == linkID) {
      return i;
    }
  }
  return -1;
};

Model.prototype.getLinkByID = function (linkID) {
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (link.link_id == linkID) {
      return link;
    }
  }
  return null;
};

Model.prototype.getNewLinkID = function () {
  var newLinkID = 0;
  for (var i = 0; i < this.data.links.length; i++) {
    var link = this.data.links[i];
    if (newLinkID <= link.link_id) {
      newLinkID = link.link_id + 1;
    }
  }
  return newLinkID;
};

Model.prototype.getNewNodeID = function () {
  var newNodeID = -1;
  for (var i = 0; i < this.data.nodes.length; i++) {
    var node = this.data.nodes[i];
    if (newNodeID <= node.node_id) {
      newNodeID = node.node_id + 1;
    }
  }
  return newNodeID;
};

Model.prototype.uploadMedia = function (mediaData, callback) {
  this.update("media", "upload");
  mediaData.append("adventureId", this.model.guid);

  this.storage.uploadMedia(mediaData, callback);
};

Model.prototype.reportAdventure = function (reportReason, callback) {
  if (!this.data.view_slug) return;
  this.storage.reportAdventure(this.data.view_slug, reportReason, callback);
};

Model.prototype.setPlayerStatistics = function (nodeId, callback) {
  this.storage.setPlayerStatistics(this.model.guid, nodeId, callback);
};

Model.prototype.newAdventure = function (callback) {
  this.storage.newAdventure(callback);
};
