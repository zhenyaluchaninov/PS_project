import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import LoadingIndicator from "../../components/loadingindicator";
import "./list.css";
import adventureService from "../../state/adventure/adventure.service";
import listService from "../../state/list/list.service";

const ListForm = ({ isEdit, list, lists, error, onSave, onCancel, onRemove }) => {
  const itemId = list ? list.id : -1;
  const [errorMessage, setErrorMessage] = useState("");
  const [adventure, setAdventure] = useState("");
  const { register, handleSubmit, setValue } = useForm();
  const [adventures, setAdventures] = useState([]);

  const onSubmit = (data) => {
    let list = {
      parent_id: parseInt(data.parent_id),
      title: data.title,
      description: data.description,
      adventures: adventures,
    };
    if (data.id) list.id = parseInt(data.id);

    onSave(list);
  };

  const saveAdventuresList = (adventuresData) => {
    let listToSave = {
      id: list.id,
      parent_id: parseInt(list.parent_id),
      title: list.title,
      description: list.description,
      adventures: adventuresData,
    };

    listService.updateList(listToSave).catch((error) => {
      alert(error);
    });
  };

  const onRemovePressed = (e) => {
    e.preventDefault();
    onRemove(itemId);
  };

  const onCancelPressed = (e) => {
    e.preventDefault();
    onCancel();
  };

  const onAddAdventurePressed = (e) => {
    e.preventDefault();
    if (adventure.length === 0) return;
    const advSearch = adventure;
    setAdventure("");

    adventureService
      .getAdventureBySlug(advSearch)
      .then((data) => {
        let found = adventures.find((item) => item.id === data.id);
        if (found) {
          alert("PSet finns redan i listan");
          return;
        }
        const adventuresData = [...adventures, data];
        setAdventures(adventuresData);
        saveAdventuresList(adventuresData);
      })
      .catch((err) => {
        alert("Hittade inga PS", err);
      });
  };

  const onRemoveAdventurePressed = (e, adv) => {
    e.preventDefault();
    const index = adventures.findIndex((i) => i.id === adv.id);
    const adventuresData = [...adventures.slice(0, index), ...adventures.slice(index + 1)];
    setAdventures(adventuresData);
    saveAdventuresList(adventuresData);
  };

  const onMoveUpAdventurePressed = (e, adv) => {
    e.preventDefault();
    const index = adventures.findIndex((i) => i.id === adv.id);
    if (index === 0) return;
    [adventures[index], adventures[index - 1]] = [adventures[index - 1], adventures[index]];
    setAdventures([...adventures]);
    saveAdventuresList([...adventures]);
  };

  useEffect(() => {
    if (list) {
      setValue("id", list.id);
      setValue("title", list.title);
      setValue("description", list.description);
      setValue("parent_id", list.parent_id);
      setAdventures(list.adventures ? list.adventures : []);
    }
    if (error) {
      setErrorMessage(error);
    }
  }, [list, error, setValue]);

  if (!list && !error) return <LoadingIndicator />;

  if (!lists) lists = [];

  // Removes current item from possible parents list
  const listsFilter = lists.filter((item) => {
    return itemId !== item.id;
  });

  return (
    <div className="p-4 border">
      {isEdit && <h3 className="mb-2 p-0">Redigera spellista</h3>}
      {!isEdit && <h3 className="mb-2 p-0">Ny spellista</h3>}
      {errorMessage && <h4>{errorMessage}</h4>}
      <form onSubmit={handleSubmit(onSubmit)} rel="noopener noreferrer">
        <input type="hidden" name="id" ref={register} />
        <div className="row">
          <div className="col-5">
            <div className="form-group">
              <label htmlFor="inputAddress">Titel</label>
              <input type="text" name="title" className="form-control" placeholder="Titel" ref={register} />
              <small id="titleHelp" className="form-text text-muted">
                Listans namn används som sökväg
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="inputAddress2">Beskrivning</label>
              <input type="text" name="description" className="form-control" placeholder="Beskrivning" ref={register} />
            </div>
            {listsFilter && (
              <div className="form-group">
                <label htmlFor="sortOrder">Överordnad spellista</label>
                <select className="form-control" name="parent_id" ref={register}>
                  <option key="0" value="0">
                    -
                  </option>
                  {listsFilter.map((listItem) => (
                    <option key={listItem.id} value={listItem.id}>
                      {listItem.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary mr-2">
              Spara
            </button>
            {isEdit && onRemove && (
              <button type="submit" onClick={(e) => onRemovePressed(e)} className="btn btn-danger mr-2">
                Radera
              </button>
            )}
            <button type="submit" onClick={(e) => onCancelPressed(e)} className="btn btn-secondary">
              Avbryt
            </button>
          </div>
          <div className="col-7">
            <div className="form-group">
              <label htmlFor="txtAddAdventure">PS</label>
              <div className="input-group mb-3">
                <input
                  type="text"
                  id="txtAddAdventure"
                  value={adventure}
                  onChange={(e) => setAdventure(e.target.value)}
                  className="form-control"
                  placeholder="Lägg till äventyr"
                  aria-label="Lägg till äventyr"
                  aria-describedby="button-addon2"
                />
                <div className="input-group-append">
                  <button className="btn btn-primary" type="button" id="button-addon2" onClick={onAddAdventurePressed}>
                    Lägg till
                  </button>
                </div>
              </div>
            </div>
            <div className="form-group">
              <div className="mt-1">
                <ul className="list-group">
                  {adventures.map((adventure) => (
                    <li key={adventure.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                      <div>{adventure.title}</div>
                      <div>
                        <button className="btn btn-sm btn-primary mr-3" id={adventure.id} onClick={(e) => onMoveUpAdventurePressed(e, adventure)}>
                          <i className="fas fa-arrow-up"></i>
                        </button>
                        <button className="btn btn-sm btn-danger" id={adventure.id} onClick={(e) => onRemoveAdventurePressed(e, adventure)}>
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ListForm;
