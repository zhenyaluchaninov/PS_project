import React, { useEffect, useState } from "react";
import ContentViewer from "./contentviewer";
import constants from "../../config";
import usersServices from "../../state/users/users.service";
import adventureService from "../../state/adventure/adventure.service";

const Form = ({ adventure, categories, onUpdate, onDelete, onCancel, onCopy, onExport }) => {
  const { id, title, category, description, locked, nodes, links, slug, view_slug, view_count, users } = adventure;

  const locked0 = locked ? locked : false;
  const category0 = category ? category.id : 0;

  const [strTitle, setTitle] = useState(title);
  const [isLocked, setLocked] = useState(locked0);
  const [strDescription, setDescription] = useState(description);
  const [intCategory, setCategory] = useState(category0);
  const [userSearchString, setUserSearchString] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [adventureUsers, setAdventureUsers] = useState([]);
  const [strViewSlug, setViewSlug] = useState(view_slug);

  useEffect(() => {
    setTitle(title);
    setLocked(locked0);
    setDescription(description);
    setCategory(category0);
    setAdventureUsers(users ?? []);
    setViewSlug(view_slug);
  }, [title, locked0, description, category0, users, view_slug]);

  useEffect(() => {
    usersServices
      .getUsers()
      .then((data) => {
        setAllUsers(data);
      })
      .catch((err) => {
        alert("Kunde inte hämta användare från server", err);
      });
  }, [id]);

  const editURL = `${constants.BASEURL}/redigera/${slug}`;
  const viewURL = `${constants.BASEURL}/${view_slug}`;

  function didClickUpdate(e) {
    e.preventDefault();
    const updatedAdventure = {
      id: adventure.id,
      locked: isLocked,
      title: strTitle,
      description: strDescription,
      category: {
        id: parseInt(intCategory),
      },
      users: adventureUsers,
      view_slug: viewSlugIsValid ? strViewSlug : view_slug,
    };

    onUpdate(updatedAdventure);
  }

  const saveUserListChanges = (usersList) => {
    const updatedUserListAdventure = {
      id: adventure.id,
      locked: locked0,
      title: title,
      description: description,
      category: {
        id: parseInt(category0),
      },
      users: usersList,
      view_slug: view_slug,
    };

    adventureService.updateAdventure(updatedUserListAdventure).catch((error) => {
      alert(error);
    });
  };

  const onAddUserPressed = (e) => {
    e.preventDefault();
    if (userSearchString.length === 0) return;
    setUserSearchString("");

    var newUser = allUsers.find((x) => x.username === userSearchString || x.name === userSearchString);
    if (!newUser) {
      alert("Den användaren finns inte");
      return;
    }
    if (adventureUsers.find((x) => x.id === newUser.id)) {
      alert("Användaren finns redan i listan");
      return;
    }

    saveUserListChanges([...adventureUsers, newUser]);
    setAdventureUsers([...adventureUsers, newUser]);
  };

  const onRemoveUserPressed = (e, user) => {
    e.preventDefault();
    const index = adventureUsers.findIndex((i) => i.id === user.id);

    saveUserListChanges([...adventureUsers.slice(0, index), ...adventureUsers.slice(index + 1)]);
    setAdventureUsers([...adventureUsers.slice(0, index), ...adventureUsers.slice(index + 1)]);
  };

  const slugRE = /^[a-zA-Z0-9-_]+$/;
  const viewSlugIsValid = slugRE.test(strViewSlug);

  return (
    <div className="p-4 border">
      <h4>Redigera äventyr</h4>
      <div className="row">
        <div className="col">
          <span className="badge mr-2 badge-primary">{view_count} visningar</span>
          {nodes && <span className="badge mr-2 badge-warning">{nodes.length} noder</span>}
          {links && <span className="badge mr-2 badge-warning">{links.length} länkar</span>}
          <span className="badge mr-2 badge-secondary">ID: #{id}</span>
        </div>
        <div className="col text-right">
          <a href={editURL} target="_blank" rel="noopener noreferrer" className="btn mr-2 btn-info">
            <i className="fas fa-edit mr-1"></i> Gå till editor
          </a>
          <a href={viewURL} target="_blank" rel="noopener noreferrer" className="btn btn-info">
            <i className="fas fa-play mr-1"></i> Spela
          </a>
        </div>
      </div>
      <p></p>

      <form>
        <div className="row">
          <div className="col-6">
            <div className="form-group">
              <label htmlFor="titel">Titel</label>
              <input type="text" className="form-control" value={strTitle} onChange={(e) => setTitle(e.target.value)} id="titel" placeholder="Titel" />
            </div>
            <div className="form-group">
              <label htmlFor="beskrivning">Beskrivning</label>
              <textarea className="form-control" value={strDescription} onChange={(e) => setDescription(e.target.value)} id="beskrivning" />
            </div>
            <div className="form-group">
              <label htmlFor="kategori">Kategori</label>
              <select className="form-control" id="kategori" value={intCategory} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="view_slug">Äventyrslänk</label>
              <input
                type="text"
                className="form-control"
                value={strViewSlug}
                onChange={(e) => setViewSlug(e.target.value)}
                id="view_slug"
                placeholder="Titel"
              />
              {viewSlugIsValid ? <span></span> : <span className="text-danger">Får bara innehålla 0 till 9, a till z, - och _. Inga mellanslag.</span>}
            </div>
          </div>
          <div className="col-6">
            <div className="form-group">
              <label htmlFor="txtAddUser">Användare</label>
              <div className="input-group mb-3">
                <select
                  className="form-control"
                  value={userSearchString}
                  onChange={(e) => setUserSearchString(e.target.value)}
                  aria-label="Lägg till användare"
                  aria-describedby="button-addon2"
                >
                  <option value="">Välj användare</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.username}>
                      {user.username}
                    </option>
                  ))}
                </select>
                <div className="input-group-append">
                  <button className="btn btn-primary" type="button" id="button-addon2" onClick={onAddUserPressed}>
                    Lägg till
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="mt-1">
                <ul className="list-group">
                  {adventureUsers.map((user) => (
                    <li key={user.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                      {user.username}{" "}
                      <button className="btn btn-sm btn-danger" id={user.id} onClick={(e) => onRemoveUserPressed(e, user)}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="form-check form-group">
          <input type="checkbox" className="form-check-input" id="locked" checked={isLocked} onChange={(e) => setLocked(!isLocked)} />
          <label className="form-check-label" htmlFor="locked">
            Låst för redigering
          </label>
          <br></br>
        </div>
      </form>

      <button className="btn btn-primary mr-2" onClick={(e) => onCopy(adventure)}>
        Kopiera
      </button>
      <button className="btn btn-primary mr-2" onClick={(e) => onExport(adventure)}>
        Exportera
      </button>
      <button className="btn btn-danger mr-2" onClick={(e) => onDelete()}>
        Radera
      </button>
      <button className="btn btn-secondary mr-5" onClick={(e) => onCancel()}>
        Avbryt
      </button>
      <button className="btn btn-dark" onClick={(e) => didClickUpdate(e)}>
        Spara
      </button>

      <div className="card mt-4">
        <ContentViewer nodes={adventure.nodes} links={adventure.links} />
      </div>
    </div>
  );
};

export default Form;
