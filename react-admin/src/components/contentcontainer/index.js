import React from "react";
import "./contentcontainer.css";

const ContentContainer = (props) => {
  return (
    <div className="container-fluid margin-top" style={{ marginLeft: 0, marginTop: 55, marginRight: 0, marginBottom: 0, padding: 0 }}>
      {props.children}
    </div>
  );
};

export default ContentContainer;
