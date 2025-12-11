import React, { useState, useEffect } from "react";
import DataTable from "../../components/datatable";
import UserModal from "../../components/userModal/UserModal.jsx";
import usersServices from "../../state/users/users.service";
import userServices from "../../state/user/user.service";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import userActions from "../../state/user/user.actions";

const Users = ({ type, loggedUserAccount }) => {
  const [searchString, setSearchString] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showModalCreate, setShowModalCreate] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", username: "" });
  const [userToEdit, setUserToEdit] = useState({ name: "", username: "" });
  const [users, setUsers] = useState([]);

  const getAllUsers = () => {
    usersServices.getUsers().then((data) => {
      setUsers(data);
      setFilteredUsers(data);
    });
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter((user) => user.name.toLowerCase().includes(searchString.toLowerCase()));
    setFilteredUsers(filtered);
  }, [searchString, users]);

  const columns = [
    { title: "ID", value: "id", type: "text" },
    { title: "Användarnamn", value: "username", type: "text" },
    { title: "Namn", value: "name", type: "text" },
    { title: "Roll", value: "role", type: "text" },
  ];

  const dispatch = useDispatch();

  function handleSignOut(e) {
    e.preventDefault();
    dispatch(userActions.signOut());
  }

  const openCreateModal = () => {
    setShowModalCreate(true);
  };

  const openEditUserModal = (id) => {
    let userToEditObject = users.find((u) => u.id === id);

    if (userToEditObject) {
      setUserToEdit(userToEditObject);
      setShowModalEdit(true);
    }
  };

  const closeModal = () => {
    setShowModalCreate(false);
    setShowModalEdit(false);
    setNewUser({ name: "", username: "" });
    setUserToEdit({ name: "", username: "" });
  };

  const saveUser = (passwordString) => {
    console.log("users page pasw", passwordString);
    if (!newUser.role) {
      newUser.role = 2;
    }
    userServices
      .createUser({ name: newUser.name, username: newUser.username, role: newUser.role, password: passwordString })
      .then(() => getAllUsers())
      .catch((error) => {
        console.error("Error creating user:", error);
      });

    closeModal();
  };

  const editUser = (passwordStr) => {
    userServices
      .updateUser({ ...userToEdit, password: passwordStr })
      .then(() => getAllUsers())
      .catch((error) => {
        console.error("Error updating user:", error);
      });

    closeModal();
  };

  const deleteUser = (id) => {
    if (!window.confirm("Är du säker?")) return;
    userServices
      .deleteUser(id)
      .then(() => getAllUsers())
      .catch((error) => {
        console.error("Error deleting user:", error);
      });

    closeModal();
  };

  return (
    <>
      {type === "myAccount" ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Du är inloggad som:</h2>
          <button className="btn btn-primary" style={{ marginLeft: "10px" }} onClick={handleSignOut}>
            <Link to="/signout" style={{ color: "inherit", textDecoration: "inherit" }}>
              Logga ut
            </Link>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Mina användare</h1>
          <button className="btn btn-primary" style={{ marginLeft: "10px" }} onClick={openCreateModal}>
            Skapa ny användare
          </button>
        </div>
      )}

      {showModalCreate && <UserModal newUser={newUser} setUser={setNewUser} closeModal={closeModal} saveUser={saveUser} modalType="create" />}
      {showModalEdit && <UserModal newUser={userToEdit} setUser={setUserToEdit} closeModal={closeModal} saveUser={editUser} modalType="update" />}

      {type !== "myAccount" && (
        <div id="nav-search" role="tabpanel" aria-labelledby="nav-search-tab" style={{ marginTop: "23px" }}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-row">
              <div className="col">
                <input
                  className="form-control form-control-lg"
                  type="text"
                  style={{ width: "310px" }}
                  placeholder="Filtrera efter namn"
                  value={searchString}
                  onChange={(e) => setSearchString(e.target.value)}
                />
              </div>
            </div>
          </form>
        </div>
      )}

      <DataTable
        actionsColumn="Åtgärder"
        // selectColumn="Visa detaljer"
        editColumn="Redigera"
        deleteColumn="Radera"
        columns={columns}
        items={loggedUserAccount ? [loggedUserAccount] : filteredUsers}
        onSelect={() => {}}
        onDelete={deleteUser}
        onEdit={openEditUserModal}
      />
    </>
  );
};

export default Users;
