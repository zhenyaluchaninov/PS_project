import React, { useState } from "react";

const UserModal = ({ newUser, setUser, closeModal, saveUser, modalType }) => {
  const [password, setPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [passwordMenuOpen, setPasswordMenuOpen] = useState(false);

  const handleSaveButtonClick = () => {
    if (passwordMenuOpen === true && (!password || !/\S/.test(password) || !repeatedPassword || !/\S/.test(repeatedPassword))) {
      alert("Lösenordet får inte bara vara mellanslag");
    } else if (passwordMenuOpen === true && password.length < 6) {
      alert("Lösenorden måste ha minst 6 tecken!");
    } else if (password === repeatedPassword) {
      if (saveUser) {
        saveUser(password);
      }
    } else {
      alert("Lösenorden matchar inte!");
    }
  };

  const togglePasswordMenu = () => {
    setPassword("");
    setRepeatedPassword("");
    setPasswordMenuOpen(!passwordMenuOpen);
  };

  const mailButtonStyle = {
    display: modalType === "create" ? "block" : "none",
  };

  const MailtoButton = ({ newUser, saveUser }) => {
    const createRandomPassword = () => {
      const letters = "abcdefghijklmnopqrstuvwxyz";
      const digits = "0123456789";
      let password = "";

      for (let i = 0; i < 3; i++) {
        password += letters.charAt(Math.floor(Math.random() * letters.length));
        password += digits.charAt(Math.floor(Math.random() * digits.length));
      }

      password = password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");

      return password;
    };

    const handleSaveAndMailButtonClick = () => {
      const randomPassword = createRandomPassword();
      console.log("Random Password:", randomPassword);

      const recipient = newUser.username;
      const subject = "Meddelande from Göteborgregionen PS app till " + newUser.name;
      const body =
        "Hej " +
        newUser.name +
        "!\n\nVälkommen till PS. Här är dina uppgiter: \n" +
        "Användarnamn: " +
        newUser.username +
        "\nTillfäligt lösenord: " +
        randomPassword +
        " \n\nDu måste logga in och ändra ditt lösenord" +
        "\n\nps.goteborgsregionen.se";

      const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      if (saveUser) {
        saveUser(randomPassword);
      }

      window.location.href = mailtoLink;
    };

    return (
      <button type="button" className="btn btn-primary" onClick={handleSaveAndMailButtonClick} style={mailButtonStyle}>
        Spara och skicka e-postmeddelande
      </button>
    );
  };

  return (
    <div className="modal" tabIndex="-1" role="dialog" style={{ display: "block" }}>
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{modalType === "create" ? "Skapa ny användare" : "Redigera"}</h5>
            <button type="button" className="close" aria-label="Close" onClick={closeModal}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <form>
              <div className="form-group">
                <label htmlFor="name">Namn</label>
                <input type="text" className="form-control" id="name" value={newUser.name} onChange={(e) => setUser({ ...newUser, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="username">Användarnamn (e-post)</label>
                <input
                  type="text"
                  className="form-control"
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setUser({ ...newUser, username: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="role">Välj roll</label>
                <select className="form-control" id="role" value={newUser.role} onChange={(e) => setUser({ ...newUser, role: parseInt(e.target.value, 10) })}>
                  <option value={2}>Medskapare</option>
                  <option value={1}>Admin</option>
                </select>
              </div>

              {modalType === "update" && (
                <div className="custom-control custom-switch">
                  <input type="checkbox" className="custom-control-input" id="customSwitch1" checked={passwordMenuOpen} onChange={togglePasswordMenu} />
                  <label className="custom-control-label" htmlFor="customSwitch1">
                    {passwordMenuOpen === false ? <>Öppna lösenordsbyte</> : <>Stäng lösenordsbyte</>}
                  </label>
                </div>
              )}
              {modalType === "update" && passwordMenuOpen && (
                <>
                  <div className="form-group">
                    <label htmlFor="password">Lösenord</label>
                    <input type="password" className="form-control" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="repeatedPassword">Repetera lösenord</label>
                    <input
                      type="password"
                      className="form-control"
                      id="repeatedPassword"
                      value={repeatedPassword}
                      onChange={(e) => setRepeatedPassword(e.target.value)}
                    />
                  </div>
                </>
              )}
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Avbryt
            </button>
            {modalType === "update" && (
              <button type="button" className="btn btn-primary" onClick={handleSaveButtonClick}>
                Spara
              </button>
            )}
            <MailtoButton newUser={newUser} saveUser={saveUser} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
