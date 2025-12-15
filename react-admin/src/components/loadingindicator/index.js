import React from "react";

const LoadingIndicator = ({title = "Loading..."}) => {
  return (
    <div className="text-center mt-5">
      <div className="spinner-border m-3" role="status">
        <span className="sr-only">{title}</span>
      </div>
    </div>
  );
}

export default LoadingIndicator;
