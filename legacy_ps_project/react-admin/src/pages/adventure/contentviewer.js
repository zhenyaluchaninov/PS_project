import React from "react";
import "./contentviewer.css";

const ContentViewer = ({ nodes, links }) => {
  const linkContent = (node) => {
    var content = [];
    if (!links) return content;

    for (let index = 0; index < links.length; index++) {
      const link = links[index];
      if (link.source === node.node_id) {
        if (link.target_title.length > 0) {
          content.push({ id: link.id, title: link.target_title, type: link.type });
        }
      }
      if (link.target === node.node_id) {
        if (link.source_title.length > 0) {
          content.push({ id: link.id, title: link.source_title, type: link.type });
        }
      }
    }
    return content;
  };

  const nodeContent = nodes.map((node) => {
    return (
      <li key={node.node_id}>
        <h5>{node.title}</h5>
        <p>{node.text}</p>
        {linkContent(node).map((link) => (
          <span key={link.id} className="badge badge-pill badge-primary mr-2">
            {link.title}
          </span>
        ))}
      </li>
    );
  });

  return (
    <div className="row">
      <div className="col">
        <ul className="timeline">{nodeContent}</ul>
      </div>
    </div>
  );
};

export default ContentViewer;
