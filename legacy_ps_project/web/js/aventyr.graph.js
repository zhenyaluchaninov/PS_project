function Graph(rootElement) {
  this.rootElement = rootElement;
}

Graph.prototype.init = function () {
  let that = this;

  this.cytoscape = cytoscape({
    container: document.getElementById(that.rootElement),
    minZoom: 0.3,
    maxZoom: 1,
  });

  this.cytoscape.on("tap", function (event) {
    var eventTarget = event.target;
    if (eventTarget == that.cytoscape) {
      that.didTapBackground();
      return;
    }

    var node = eventTarget;
    if (node.group() == "nodes") {
      that.tappedNode(node.data("node_id"));
    } else if (node.group() == "edges") {
      that.tappedLink(node.data("link_id"));
    }
  });

  this.cytoscape.on("cxttap", function (e) {
    var t = e.target;
    if (t != that.cytoscape && t.group() == "nodes") {
      that.didDblTapNode(t.data("node_id"));
    }
  });

  this.cytoscape.on("mouseover", function (e) {
    if (e.target != that.cytoscape) {
      e.target.addClass("hover");
    }
  });

  this.cytoscape.on("mouseout", function (e) {
    if (e.target != that.cytoscape) {
      e.target.removeClass("hover");
    }
  });

  this.cytoscape.on("free", function (e) {
    if (e.target != that.cytoscape) {
      if (that.didMoveNode) {
        var node = e.target;
        var nodeID = node.data("node_id");
        var x = Math.round(node.position("x"));
        var y = Math.round(node.position("y"));
        that.didMoveNode(nodeID, x, y);
      }
    }
  });

  this.cytoscape.on("pan", function (e) {
    if (e.target == that.cytoscape) {
      if (that.didPanGraph) {
        var graphPosition = that.cytoscape.pan();
        var x = Math.round(graphPosition.x);
        var y = Math.round(graphPosition.y);
        that.didPanGraph(x, y);
      }
    }
  });

  this.cytoscape.on("zoom", function (e) {
    if (e.target == that.cytoscape) {
      if (that.didZoomGraph) {
        var zoomLevel = that.cytoscape.zoom();
        that.didZoomGraph(zoomLevel);
      }
    }
  });

  this.updateStyle();
};

Graph.prototype.deselectNode = function (nodeID) {
  var node = this.cytoscape.$("#n" + nodeID);
  node.unselect();
};

Graph.prototype.selectNode = function (selectedNodeID) {
  var node = this.cytoscape.$("#n" + selectedNodeID);
  node.select();
  if (this.didTapNode) {
    this.didTapNode(selectedNodeID);
  }
};

Graph.prototype.getSelectedNodeIds = function () {
  var selectedNodes = this.cytoscape.elements("node:selected");
  var nodeIds = selectedNodes.map((x) => x.data("node_id"));
  return nodeIds;
};

Graph.prototype.tappedNode = function (nodeData) {
  if (this.didTapNode) {
    this.didTapNode(nodeData);
  }
};

Graph.prototype.tappedLink = function (linkID) {
  if (this.didTapLink) {
    this.didTapLink(linkID);
  }
};

Graph.prototype.tappedBackground = function () {
  if (this.didTapBackground) {
    this.didTapBackground();
  }
};

Graph.prototype.nodeText = function (node) {
  const t = node.title;
  return t[0] == "#" ? t : "#" + node.node_id + "\n" + t;
};

Graph.prototype.load = function (model) {
  var elements = [];

  // Process Nodes
  for (var i = 0; i < model.nodes.length; i++) {
    var node = model.nodes[i];
    var isRoot = node.type == "root";
    var element = {
      group: "nodes",
      data: {
        id: "n" + node.node_id,
        node_id: node.node_id,
        title: this.nodeText(node),
      },
      classes: isRoot ? "root" : "node",
    };
    if (node.x != null && node.y != null) {
      element.position = {};
      element.position.x = node.x;
      element.position.y = node.y;
    }
    if (isRoot) {
      element.data.weight = 100;
    }
    elements.push(element);
  }

  // Process Links
  for (var i = 0; i < model.links.length; i++) {
    var link = model.links[i];
    elements.push({
      group: "edges",
      data: {
        id: "l" + link.link_id,
        link_id: link.link_id,
        source: "n" + link.source,
        target: "n" + link.target,
      },
      classes: link.type,
    });
  }

  this.cytoscape.add(elements);
  this.cytoscape.fit();
  this.updateLayout(false);
};

Graph.prototype.updateNode = function (nodeID, node) {
  this.cytoscape.$("#n" + nodeID).data("title", this.nodeText(node));
};

Graph.prototype.updateLink = function (linkID, type, source, target) {
  var link = this.cytoscape.$("#l" + linkID);
  // console.log("Removing link", link.data());
  link.remove();

  var sourceNode = this.cytoscape.$("#n" + source);
  var targetNode = this.cytoscape.$("#n" + target);

  // console.log("Adding link");
  this.cytoscape.add([
    {
      group: "edges",
      data: {
        id: "l" + linkID,
        link_id: linkID,
        source: sourceNode.id(),
        target: targetNode.id(),
      },
      classes: type,
      selected: true,
    },
  ]);

  //this.updateLayout(false);
};

Graph.prototype.addNode = function (node, linkID) {
  var parentNode = this.cytoscape.$("#n" + node.parent);

  this.cytoscape.add([
    {
      group: "nodes",
      data: {
        id: "n" + node.node_id,
        node_id: node.node_id,
        title: node.title,
      },
      classes: "node",
      position: {
        x: parentNode.position("x"),
        y: parentNode.position("y") + 200,
      },
    },
    {
      group: "edges",
      data: {
        id: "l" + linkID,
        link_id: linkID,
        source: "n" + node.parent,
        target: "n" + node.node_id,
      },
      classes: "default",
    },
  ]);

  // var panPosition = this.cytoscape.pan();
  // console.log("Panposition", panPosition);
  //
  // var newNode = this.cytoscape.$("#n" + nodeID);
  // console.log("New node", newNode);
  // this.cytoscape.center(newNode);

  this.updateLayout(true);
};

Graph.prototype.addLink = function (linkID, sourceNodeID, targetNodeID) {
  var sourceNode = this.cytoscape.$("#n" + sourceNodeID);
  var targetNode = this.cytoscape.$("#n" + targetNodeID);

  this.cytoscape.add([
    {
      group: "edges",
      data: {
        id: "l" + linkID,
        link_id: linkID,
        source: sourceNode.id(),
        target: targetNode.id(),
      },
      classes: "default",
    },
  ]);
  this.updateLayout(true);
};

Graph.prototype.deleteNode = function (nodeID) {
  var node = this.cytoscape.$("#n" + nodeID);
  var currentNodeID = node.id();
  var children = node.connectedEdges();
  node.remove();

  for (var i = 0; i < children.length; i++) {
    edge = children[i];
    if (edge.source() == node) {
      edge.target().remove();
    }
  }

  this.updateLayout(true);
};

Graph.prototype.deleteLink = function (linkID) {
  var link = this.cytoscape.$("#l" + linkID);
  link.remove();
  this.updateLayout(true);
};

Graph.prototype.updateView = function () {
  this.cytoscape.resize();
  this.updateLayout(false);
};

Graph.prototype.updateLayout = function (animated) {
  // Disabled autoupdate of layout
  return;

  let options = {
    name: "breadthfirst",

    fit: true, // whether to fit the viewport to the graph
    directed: false, // whether the tree is directed downwards (or edges can point in any direction if false)
    padding: 30, // padding on fit
    circle: false, // put depths in concentric circles if true, put depths top down if false
    grid: false, // whether to create an even grid into which the DAG is placed (circle:false only)
    spacingFactor: 1.75, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
    boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
    nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
    roots: undefined, // the roots of the trees
    maximal: true, // whether to shift nodes down their natural BFS depths in order to avoid upwards edges (DAGS only)
    animate: false, // whether to transition the node positions
    animationDuration: 500, // duration of animation in ms if enabled
    animationEasing: undefined, // easing of animation if enabled,
    animateFilter: function (node, i) {
      return true;
    }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
    ready: undefined, // callback on layoutready
    stop: undefined, // callback on layoutstop
    transform: function (node, position) {
      return position;
    }, // transform a given node position. Useful for changing flow direction in discrete layouts
  };

  if (animated) {
    options.animate = true;
    options.animationDuration = 200;
    options.animationEasing = "ease-in-out-sine";
  }

  var layout = this.cytoscape.layout(options);
  layout.run();
};

Graph.prototype.updateStyle = function () {
  style = [
    // the stylesheet for the graph
    {
      selector: "node",
      css: {
        "background-color": "#666",
        "text-valign": "center",
        "text-wrap": "wrap",
        "text-max-width": "100",
        "font-size": "12",
        shape: "roundrectangle",
        label: "data(title)",
        width: "115",
        height: "75",
        "border-width": "2",
      },
    },
    {
      selector: "node.root",
      style: {
        width: "115",
        height: "75",
        "background-color": "#3f3",
      },
    },
    {
      selector: "node.node",
      css: {
        "background-color": "#acf",
        "border-color": "#000",
      },
    },
    {
      selector: "node.hint",
      css: {
        "background-color": "#9ff",
        label: "data(id)",
        width: "50",
        height: "50",
        "border-width": "5",
      },
    },
    {
      selector: "node:selected",
      css: {
        "background-color": "#191",
        color: "#fff",
      },
    },
    {
      selector: "edge",
      css: {
        "target-arrow-shape": "triangle",
        width: "3",
      },
    },
    {
      selector: "edge.bezier",
      style: {
        "curve-style": "bezier",
        "control-point-step-size": 40,
        "target-arrow-shape": "triangle",
      },
    },
    {
      selector: "edge.default",
      style: {
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#000",
        "line-color": "#000",
      },
    },
    {
      selector: "edge.bidirectional",
      style: {
        "curve-style": "bezier",
        "source-arrow-shape": "triangle",
        "source-arrow-color": "#000",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#000",
        "line-color": "#000",
      },
    },
    {
      selector: "edge.hover",
      css: {
        "line-color": "#aaa",
        "source-arrow-color": "#aaa",
        "target-arrow-color": "#aaa",
      },
    },
    {
      selector: "edge:selected",
      css: {
        "line-color": "#191",
        "source-arrow-color": "#191",
        "target-arrow-color": "#191",
      },
    },
    {
      selector: "node.hover",
      css: {
        "background-color": "#777",
        color: "#fff",
      },
    },
  ];

  this.cytoscape.style().fromJson(style);
};
