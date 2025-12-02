import React, { useEffect, useState } from "react";
import { connect, useDispatch } from "react-redux";
import userActions from "../../state/user/user.actions";
import userService from "../../state/user/user.service";
import constants from "../../config";
import listService from "../../state/list/list.service";
import listsService from "../../state/lists/lists.service";

const CoCreatorStartPage = (props) => {
  const [currentUserAdventures, setCurrentUserAdventures] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [examplesAdventures, setExamplesAdventures] = useState([]);
  const [allAdventures, setAllAdventures] = useState([]);

  const pageStyle = {
    backgroundColor: "#3c3d40",
    color: "white",
    minHeight: "100vh",
  };

  const pageTitle = "PS";

  const getExampleAdventures = async () => {
    try {
      let allLists = await listsService.getAllLists();
      let examplesList = allLists?.find((x) => x.title === "Medskapare_exempel");
      let exampleListID = examplesList.id;
      let examplesListData = await listService.getList(exampleListID);
      let examplesAdventuresData = examplesListData?.adventures.map((x) => ({ ...x, isExample: true }));

      setExamplesAdventures(examplesAdventuresData);
    } catch (error) {
      console.error("Error", error);
    }
  };

  const dispatch = useDispatch();

  useEffect(() => {
    const getCurrentUserAdventures = async () => {
      try {
        const userData = await userService.getUser(props.currentUser.userId);
        setCurrentUserData(userData);
        return userData.adventures;
      } catch (error) {
        console.error(`Error getting adventure details for adventure `, error);
        return [];
      }
    };

    const fetchData = async () => {
      try {
        const adventures = await getCurrentUserAdventures();
        setCurrentUserAdventures(adventures);
      } catch (error) {
        console.error("Error fetching adventures:", error);
      }
    };

    const fetchDataAndExamples = async () => {
      try {
        await fetchData();
        await getExampleAdventures();
      } catch (error) {
        console.error("Error fetching data", error);
      }
    };

    fetchDataAndExamples();

    // Fetch data when the window/tab gains focus because editing is happening in other tab in browser
    const handleWindowFocus = () => {
      fetchData();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [props.currentUser.userId]);

  useEffect(() => {
    setAllAdventures(currentUserAdventures.concat(examplesAdventures));
  }, [currentUserAdventures, examplesAdventures]);

  const handleSignOut = (e) => {
    e.preventDefault();
    dispatch(userActions.signOut());
  };

  const changePassword = (passwordString) => {
    userService.updateUser({ ...currentUserData, password: passwordString }).catch((error) => {
      console.error("Error updating user:", error);
    });
  };

  const handleChangePassword = () => {
    if (!newPassword || !/\S/.test(newPassword) || !confirmPassword || !/\S/.test(confirmPassword)) {
      alert("Lösenordet får inte bara vara mellanslag");
    } else if (newPassword.length < 6) {
      alert("Lösenorden måste ha minst 6 tecken!");
    } else if (newPassword === confirmPassword) {
      changePassword(newPassword);
      alert("Lösenord är ändrat.");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordOpen(false);
    } else {
      alert("Lösenorden matchar inte!");
    }
  };

  const handleCancelChangePassword = () => {
    setChangePasswordOpen(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <>
      <div style={pageStyle}>
        <div className="sticky-top" style={{ backgroundColor: "#343635", top: 0, zIndex: 1000 }}>
          <div className="d-flex justify-content-between align-items-center p-4" style={{ backgroundColor: "#343635" }}>
            <h1>{pageTitle}</h1>
            <img src={constants.BASEURL + "/static/img/LogoWhite.png"} alt="Logo" style={{ width: "230px" }} />
            <div className="dropdown" style={{ position: "relative" }}>
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="dropdownMenuButton"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                style={{ marginLeft: "auto" }}
                onClick={() => setChangePasswordOpen(false)}
              >
                {currentUserData?.username}
              </button>
              <div
                className={`dropdown-menu ${changePasswordOpen ? "show" : ""}`}
                aria-labelledby="dropdownMenuButton"
                style={{ backgroundColor: "#647067", left: "auto", right: 0 }}
              >
                <a className="dropdown-item" href="#logout" onClick={handleSignOut}>
                  Logga ut
                </a>
                <div className="dropdown-divider"></div>
                <a
                  className="dropdown-item"
                  href="#changepass"
                  onClick={(e) => {
                    e.preventDefault();
                    setChangePasswordOpen(!changePasswordOpen);
                  }}
                >
                  Ändra lösenord
                </a>
                {changePasswordOpen && (
                  <div
                    className="dropdown-item"
                    style={{ position: "absolute", right: "100%", top: "0", minWidth: "200px", padding: "10px", backgroundColor: "#647067" }}
                  >
                    <div>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Ny lösenord"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Repetera lösenord"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <button className="btn btn-primary" onClick={handleChangePassword}>
                        Bekräfta
                      </button>
                      <button className="btn btn-secondary ml-2" onClick={handleCancelChangePassword}>
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="row" style={{ marginLeft: "10px", marginRight: "10px", marginTop: "20px" }}>
          {allAdventures.length === 0 && <div style={{ marginLeft: "12px" }}>Du har inga PS tilldelade på ditt konto.</div>}
          {allAdventures.map((item, index) => (
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
                  <a href={`${constants.BASEURL}/redigera/` + item.slug} rel="noopener noreferrer" target="_blank">
                    {!item.isExample && (
                      <button className="btn btn-info mr-2" style={{ backgroundColor: "#ecd896", color: "black" }}>
                        Redigera
                      </button>
                    )}
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

const mapStateToProps = (state) => ({
  currentUser: state.currentUser,
});

export default connect(mapStateToProps)(CoCreatorStartPage);
