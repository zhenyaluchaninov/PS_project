import React, { useEffect, useState } from "react";
import constants from "../../config";

const PresentationModePage = (props) => {
  const [currentUserAdventures, setCurrentUserAdventures] = useState([]);

  const pageStyle = {
    backgroundColor: "#3c3d40",
    color: "white",
    minHeight: "100vh",
  };

  useEffect(() => {
    if (props.adventuresList) setCurrentUserAdventures(props.adventuresList);
  }, [props.adventuresList]);

  return (
    <>
      <div style={pageStyle}>
        <div className="sticky-top" style={{ backgroundColor: "#343635", top: 0, zIndex: 1000 }}>
          <div style={{ backgroundColor: "#343635", display: "flex", justifyContent: "center", alignItems: "center", height: "70px" }}>
            <img src={constants.BASEURL + "/static/img/LogoWhite.png"} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", marginBottom: "50px" }} />
          </div>
        </div>
        <div className="row" style={{ marginLeft: "10px", marginRight: "10px", marginTop: "20px" }}>
          {currentUserAdventures.length === 0 && <div style={{ marginLeft: "12px" }}>Det finns inga PS att visa.</div>}
          {currentUserAdventures.map((item, index) => (
            <div key={index} className="col-md-4" style={{ marginBottom: "30px", marginRight: "0px", marginLeft: "0px" }}>
              <a href={`${constants.BASEURL}/` + item.view_slug} rel="noopener noreferrer" target="_blank">
                <img
                  className="card-img-top"
                  src={constants.BASEURL + (item.cover_url ?? "/static/img/PS-default-cover.jpg")}
                  alt="Finns inte någon bild"
                  style={{ objectFit: "cover", height: "240px" }}
                />
              </a>

              <div className="card-body d-flex flex-column align-items-stretch" style={{ height: "160px", background: "black" }}>
                <h3 className="card-title">{item.title.length > 27 ? `${item.title.substring(0, 24)}...` : item.title}</h3>
                <p className="card-text">{item.description.length > 66 ? `${item.description.substring(0, 52)}...` : item.description}</p>
                <div className="d-flex justify-content-center">
                  <a href={`${constants.BASEURL}/` + item.view_slug} rel="noopener noreferrer" target="_blank">
                    <button className="btn btn-primary mr-2" style={{ backgroundColor: "#00a39c", color: "white" }}>
                      Spela
                    </button>
                  </a>

                  <div className="ml-auto"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default PresentationModePage;
